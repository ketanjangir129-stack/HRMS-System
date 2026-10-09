const db = require("../config/firebase");
const cloudinary = require("../config/cloudinary");
const {uploadFile} = require("./uploadServices");

const {
  DEFAULT_TIMEZONE,
  getDateKey,
  parseDateKey,
  getMonthPath,
  formatTime,
  isFutureDate,
} = require("../utils/attendanceDate");
const {
  normalizeWorkRules,
  calculateWorkingHours,
  resolvePunchInStatus,
  getApprovalStatus,
  makeApproval,
  parsePunchTime,
} = require("../utils/attendanceRules");
const { loadDepartments } = require("../utils/departmentRefs");

/*
|--------------------------------------------------------------------------
| Attendance Service
|--------------------------------------------------------------------------
| Database path:
| companies/{companyCode}/attendance/records/{year}/{Month}/{date}/{employeeId}
|--------------------------------------------------------------------------
*/

/* ── Constants ── */

const ROLES = Object.freeze({
  OWNER: "owner",
  HR: "hr",
  MANAGER: "manager",
  EMPLOYEE: "employee",
});

const MONTHS = Object.freeze([
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]);

const ATTENDANCE_STATUSES = new Set(["Present", "Late", "Absent", "Leave", "Half Day"]);
const APPROVAL_STATUSES = new Set(["Approved", "Rejected"]);
const EMPLOYEE_ID_PATTERN = /^[A-Z0-9_-]{1,50}$/;

/* ── Helpers ── */

const normalizeId = (value) =>
  String(value ?? "").trim().toUpperCase();

const normalizeRole = (value) =>
  String(value ?? "").trim().toLowerCase();

const serviceError = (message, statusCode = 500, code) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
};

const getMonthName = (month) => MONTHS[month - 1] || null;

/* ── Firebase Paths ── */

const companyPath = (companyCode, child = "") => {
  const code = String(companyCode ?? "").trim();
  if (!code) throw serviceError("Company context is required.", 401);
  return child ? `companies/${code}/${child}` : `companies/${code}`;
};

const recordsRoot = (companyCode) =>
  companyPath(companyCode, "attendance/records");

const recordPath = (companyCode, date, employeeId) =>
  `${recordsRoot(companyCode)}/${getMonthPath(date)}/${date}/${employeeId}`;

/* ── Date Validation ── */

const validateDate = (dateKey, { allowFuture = false, timezone } = {}) => {
  if (!parseDateKey(dateKey)) {
    throw serviceError("Invalid date. Expected YYYY-MM-DD.", 400, "INVALID_DATE");
  }
  if (!allowFuture && isFutureDate(dateKey, timezone)) {
    throw serviceError("Future attendance is not available.", 400, "FUTURE_DATE_NOT_ALLOWED");
  }
};

const validateYearMonth = (year, month) => {
  const y = Number(year);
  const m = Number(month);

  if (!Number.isInteger(y) || y < 2000 || y > 2100) {
    throw serviceError("Invalid year.", 400);
  }
  if (!Number.isInteger(m) || m < 1 || m > 12) {
    throw serviceError("Invalid month.", 400);
  }

  return { year: y, month: m, monthName: getMonthName(m) };
};

/* ── User Identity ── */

const getUserRole = (user) => normalizeRole(user?.role);

const getUserEmployeeId = (user) =>
  normalizeId(user?.employeeId || user?.employee?.employeeId);

/* ── Scope: Which employees can this user see? ── */

const loadEmployees = async (companyCode) => {
  const snapshot = await db
    .ref(companyPath(companyCode, "employees"))
    .once("value");
  return snapshot.val() || {};
};

/*
 * One employee's employment block instead of the whole employees node.
 * Employee keys are stored upper-case (see authMiddleware), so the normalized
 * id is the key. Returns null when the employee does not exist.
 */
const loadEmployment = async (companyCode, employeeId) => {
  const base = companyPath(companyCode, `employees/${employeeId}`);
  const snapshot = await db.ref(`${base}/employmentInfo`).once("value");
  if (snapshot.exists()) return snapshot.val() || {};

  // Rare: an employee without employmentInfo. Confirm the record exists.
  const account = await db.ref(`${base}/account`).once("value");
  return account.exists() ? {} : null;
};

const getManagedDepartmentIds = (departments, managerEmployeeId) => {
  const managerId = normalizeId(managerEmployeeId);
  if (!managerId) return [];

  return Object.entries(departments || {})
    .filter(([, dept]) => normalizeId(dept?.manager?.employeeId) === managerId)
    .map(([id]) => id);
};

const getAccessibleEmployeeIds = async (companyCode, user) => {
  const role = getUserRole(user);
  if (!role) throw serviceError("User role is missing.", 403);

  /* Employee → self only. Never needs the full employees node. */
  if (role === ROLES.EMPLOYEE) {
    const id = getUserEmployeeId(user);
    if (!id) throw serviceError("Employee identity is missing.", 403);

    if (!(await loadEmployment(companyCode, id))) {
      throw serviceError("Employee record not found.", 403);
    }

    return [id];
  }

  /* Owner / HR → all employees */
  if (role === ROLES.OWNER || role === ROLES.HR) {
    return Object.keys(await loadEmployees(companyCode));
  }

  /* Manager → employees in managed departments */
  if (role === ROLES.MANAGER) {
    const managerId = getUserEmployeeId(user);
    if (!managerId) throw serviceError("Manager employee identity is missing.", 403);

    const [departments, employees] = await Promise.all([
      loadDepartments(companyCode),
      loadEmployees(companyCode),
    ]);
    const deptIds = getManagedDepartmentIds(departments, managerId);

    if (deptIds.length === 0) return [];

    const deptSet = new Set(deptIds);
    return Object.entries(employees)
      .filter(([, emp]) => deptSet.has(emp?.employmentInfo?.departmentId))
      .map(([id]) => id);
  }

  throw serviceError("You do not have permission to access attendance.", 403);
};

/* ── Record Filters ── */

const filterByScope = (records, employeeIds) => {
  const allowed = new Set(employeeIds);
  return Object.fromEntries(
    Object.entries(records || {}).filter(([id]) => allowed.has(id))
  );
};

const filterMonthByScope = (monthRecords, employeeIds) => {
  const allowed = new Set(employeeIds);
  return Object.fromEntries(
    Object.entries(monthRecords || {}).map(([date, daily]) => [
      date,
      Object.fromEntries(
        Object.entries(daily || {}).filter(([id]) => allowed.has(id))
      ),
    ])
  );
};


const validateAttendanceImage = (file) => {
  if (!file || !Buffer.isBuffer(file.buffer) || !file.buffer.length) {
    throw serviceError(
      "An attendance photo is required.",
      400,
      "ATTENDANCE_IMAGE_REQUIRED"
    );
  }

  if (file.buffer.length > 5 * 1024 * 1024) {
    throw serviceError(
      "Attendance photo must not exceed 5 MB.",
      413,
      "ATTENDANCE_IMAGE_TOO_LARGE"
    );
  }

  const buffer = file.buffer;

  const isJpeg =
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;

  const isPng =
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    );

  const isWebp =
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP";

  if (!isJpeg && !isPng && !isWebp) {
    throw serviceError(
      "Upload a valid JPEG, PNG, or WebP image.",
      400,
      "INVALID_ATTENDANCE_IMAGE"
    );
  }

  return true;
};

const uploadAttendanceImage = async ({
  companyCode,
  employeeId,
  date,
  action,
  file,
}) => {
  validateAttendanceImage(file);

  return uploadFile(file.buffer, {
    folder: `companies/${companyCode}/attendance/${employeeId}/${date}`,
    resourceType: "image",
    maxBytes: 5 * 1024 * 1024,
  });
};

const deleteAttendanceImage = async (image) => {
  if (!image?.publicId) return;

  try {
    await cloudinary.uploader.destroy(image.publicId, {
      resource_type: "image",
    });
  } catch (error) {
    // Cleanup failure should not hide the original attendance error.
    console.error("Attendance image cleanup failed:", error.message);
  }
};



/*
|--------------------------------------------------------------------------
| READ: Daily Attendance
|--------------------------------------------------------------------------
| GET /api/attendance/daily?date=2026-10-05
|--------------------------------------------------------------------------
*/

const getDailyAttendance = async (companyCode, date, user) => {
  validateDate(date);

  const employeeIds = await getAccessibleEmployeeIds(companyCode, user);

  const parsed = parseDateKey(date);
  const monthName = getMonthName(parsed.month);
  const path = companyPath(
    companyCode,
    `attendance/records/${parsed.year}/${monthName}/${date}`
  );

  /* An employee only ever sees their own row: read that row, not the day. */
  if (getUserRole(user) === ROLES.EMPLOYEE) {
    const [id] = employeeIds;
    const own = await db.ref(`${path}/${id}`).once("value");

    return { date, records: own.exists() ? { [id]: own.val() } : {} };
  }

  const snapshot = await db.ref(path).once("value");

  return {
    date,
    records: filterByScope(snapshot.val(), employeeIds),
  };
};

/*
|--------------------------------------------------------------------------
| READ: Monthly Attendance
|--------------------------------------------------------------------------
| GET /api/attendance/monthly?year=2026&month=10
|--------------------------------------------------------------------------
*/

const getMonthlyAttendance = async (companyCode, year, month, user) => {
  const { year: y, month: m, monthName } = validateYearMonth(year, month);

  const employeeIds = await getAccessibleEmployeeIds(companyCode, user);

  const path = companyPath(
    companyCode,
    `attendance/records/${y}/${monthName}`
  );

  const snapshot = await db.ref(path).once("value");

  return {
    year: y,
    month: m,
    monthName,
    records: filterMonthByScope(snapshot.val(), employeeIds),
  };
};

/*
|--------------------------------------------------------------------------
| READ: Employee Attendance (one employee, one month)
|--------------------------------------------------------------------------
| GET /api/attendance/employee/:employeeId?year=2026&month=10
|--------------------------------------------------------------------------
*/

const getEmployeeAttendance = async (companyCode, employeeId, year, month, user) => {
  const requestedId = normalizeId(employeeId);
  if (!requestedId) throw serviceError("Employee ID is required.", 400);

  const { year: y, month: m, monthName } = validateYearMonth(year, month);

  // Targeted scope check: one employee, not the whole employees node.
  const { employeeId: actualId } = await assertEmployeeScope(
    companyCode,
    requestedId,
    user
  );

  const path = companyPath(
    companyCode,
    `attendance/records/${y}/${monthName}`
  );

  /*
   * Read this employee's node under each day instead of the whole month
   * (which holds every employee's records). The reads run in parallel over
   * the same connection.
   */
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const dates = Array.from(
    { length: daysInMonth },
    (_, index) => `${y}-${String(m).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`
  );

  const snapshots = await Promise.all(
    dates.map((date) => db.ref(`${path}/${date}/${actualId}`).once("value"))
  );

  const records = {};
  snapshots.forEach((snapshot, index) => {
    if (snapshot.exists()) records[dates[index]] = snapshot.val();
  });

  return {
    employeeId: actualId,
    year: y,
    month: m,
    monthName,
    records,
  };
};

/*
|--------------------------------------------------------------------------
| MUTATIONS: Shared Helpers
|--------------------------------------------------------------------------
*/

const mutationActor = (user) =>
  normalizeId(user?.employeeId || user?.employmentInfo?.employeeId || user?.uid) || "owner";

const loadAttendanceSettings = async (companyCode) => {
  const snapshot = await db
    .ref(companyPath(companyCode, "attendance/settings"))
    .once("value");
  const stored = snapshot.val() || {};
  return { ...normalizeWorkRules(stored), timezone: stored.timezone || DEFAULT_TIMEZONE };
};

/*
 * Confirms the user may act on one employee's attendance.
 *
 * Reads only that employee's employmentInfo (plus departments for a manager)
 * instead of the full employees node. `cache` lets bulk callers share the
 * departments read across many ids.
 */
const assertEmployeeScope = async (
  companyCode,
  employeeId,
  user,
  approverOnly = false,
  cache = {}
) => {
  const id = normalizeId(employeeId);
  if (!EMPLOYEE_ID_PATTERN.test(id)) {
    throw serviceError("A valid employee ID is required.", 400, "INVALID_EMPLOYEE_ID");
  }

  const role = getUserRole(user);
  if (!role) throw serviceError("User role is missing.", 403, "ACCESS_DENIED");

  if (approverOnly && ![ROLES.OWNER, ROLES.HR, ROLES.MANAGER].includes(role)) {
    throw serviceError("You do not have permission to approve attendance.", 403, "ACCESS_DENIED");
  }

  if (role === ROLES.EMPLOYEE && getUserEmployeeId(user) !== id) {
    throw serviceError("Employees can only access their own attendance.", 403, "ACCESS_DENIED");
  }

  const employment = await loadEmployment(companyCode, id);
  if (!employment) {
    throw serviceError("Employee not found.", 404, "EMPLOYEE_NOT_FOUND");
  }

  if ([ROLES.OWNER, ROLES.HR, ROLES.EMPLOYEE].includes(role)) {
    return { employeeId: id };
  }

  if (role === ROLES.MANAGER) {
    const managerId = getUserEmployeeId(user);
    if (!managerId) throw serviceError("Manager employee identity is missing.", 403, "ACCESS_DENIED");

    cache.departments ??= loadDepartments(companyCode);
    const managed = getManagedDepartmentIds(await cache.departments, managerId);

    if (!managed.includes(employment.departmentId)) {
      throw serviceError("You do not have access to this employee's attendance.", 403, "ACCESS_DENIED");
    }

    return { employeeId: id };
  }

  throw serviceError("You do not have permission to access attendance.", 403, "ACCESS_DENIED");
};

const buildRecord = ({ employeeId, date, punchIn = null, punchOut = null,
  status = "", remarks = "", approval, settings, createdAt = Date.now() }) => ({
  employeeId,
  date,
  punchIn,
  punchInTime: punchIn ? formatTime(punchIn, settings?.timezone) : "",
  punchOut,
  punchOutTime: punchOut ? formatTime(punchOut, settings?.timezone) : "",
  workingHours: calculateWorkingHours(punchIn, punchOut),
  status: status || (punchIn ? resolvePunchInStatus(punchIn, settings) : ""),
  remarks,
  ...approval,
  createdAt,
});

const sanitizeLocation = (location, timestamp) => {
  if (location == null) return null;
  const lat = Number(location.latitude);
  const lng = Number(location.longitude);
  const acc = location.accuracy == null ? null : Number(location.accuracy);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 ||
      !Number.isFinite(lng) || lng < -180 || lng > 180 ||
      (acc !== null && (!Number.isFinite(acc) || acc < 0))) {
    throw serviceError("A valid location is required.", 400, "INVALID_LOCATION");
  }
  return { latitude: lat, longitude: lng, accuracy: acc, capturedAt: timestamp };
};

/*
|--------------------------------------------------------------------------
| MUTATION: Punch In
|--------------------------------------------------------------------------
*/

/*
 * Shared punch rules. Used twice per punch: once against a fresh read so a
 * punch that can never succeed is rejected BEFORE the photo is uploaded, and
 * again inside the transaction where the write is decided atomically.
 */
const isHalfDayLeaveAwaitingPunch = (current) =>
  current?.status === "Half Day" && current?.leaveRequestId && !current?.punchIn;

const getPunchInRejection = (current) => {
  if (!current) return null;

  if (current.status === "Leave") {
    return serviceError("You are on approved leave today.", 409, "ATTENDANCE_ON_LEAVE");
  }

  if (isHalfDayLeaveAwaitingPunch(current)) return null;

  return serviceError("Attendance already marked.", 409, "ATTENDANCE_ALREADY_MARKED");
};

const getPunchOutRejection = (current, now, date) => {
  if (!current || !Number.isFinite(Number(current.punchIn))) {
    return serviceError(`No punch-in record found for ${date}.`, 409, "PUNCH_IN_REQUIRED");
  }

  if (current.punchOut) {
    return serviceError(
      "Attendance has already been punched out.",
      409,
      "PUNCH_OUT_ALREADY_MARKED"
    );
  }

  if (now <= Number(current.punchIn)) {
    return serviceError("Punch out must be after punch in.", 400, "INVALID_PUNCH_TIME");
  }

  return null;
};

/*
 * Everything a punch needs before it can upload: identity/scope, settings and
 * the current record. Independent reads, so they run in parallel.
 */
const preparePunch = async (companyCode, payload, user, imageFile) => {
  // Cheap, synchronous checks first so a bad request costs no reads.
  validateAttendanceImage(imageFile);

  const [{ employeeId }, settings] = await Promise.all([
    assertEmployeeScope(companyCode, payload?.employeeId, user),
    loadAttendanceSettings(companyCode),
  ]);

  const now = Date.now();
  const date = getDateKey(now, settings.timezone);
  const location = sanitizeLocation(payload?.location, now);
  const ref = db.ref(recordPath(companyCode, date, employeeId));
  const current = (await ref.once("value")).val();

  return { employeeId, settings, now, date, location, ref, current };
};

/*
 * What a punch response carries back: only the fields the punch card shows.
 * Location, approval and audit fields stay on the server.
 */
const punchSummary = (record) => ({
  punchIn: record?.punchIn || null,
  punchInTime: record?.punchInTime || "",
  punchOut: record?.punchOut || null,
  punchOutTime: record?.punchOutTime || "",
  status: record?.status || "",
  images: {
    punchIn: record?.images?.punchIn?.url ? { url: record.images.punchIn.url } : null,
    punchOut: record?.images?.punchOut?.url ? { url: record.images.punchOut.url } : null,
  },
});

const punchInEmployee = async (companyCode, payload, user, imageFile) => {
  const { employeeId, settings, now, date, location, ref, current: existing } =
    await preparePunch(companyCode, payload, user, imageFile);

  const early = getPunchInRejection(existing);
  if (early) throw early;

  const uploadedImage = await uploadAttendanceImage({
    companyCode,
    employeeId,
    date,
    action: "punch-in",
    file: imageFile,
  });

  let rejected;

  try {
    const transaction = await ref.transaction((current) => {
      rejected = null;

      if (current) {
        rejected = getPunchInRejection(current);
        if (rejected) return;

        if (isHalfDayLeaveAwaitingPunch(current)) {
          return {
            ...current,
            punchIn: now,
            punchInTime: formatTime(now, settings.timezone),
            ...makeApproval({ at: now }),
            ...(location
              ? {
                  location: {
                    ...(current.location || {}),
                    punchIn: location,
                  },
                }
              : {}),
            images: {
              ...(current.images || {}),
              punchIn: uploadedImage,
            },
          };
        }
      }

      return {
        ...buildRecord({
          employeeId,
          date,
          punchIn: now,
          settings,
          approval: makeApproval({ at: now }),
        }),
        ...(location ? { location: { punchIn: location } } : {}),
        images: {
          punchIn: uploadedImage,
          punchOut: null,
        },
      };
    });

    if (rejected) throw rejected;

    if (!transaction.committed) {
      throw serviceError(
        "Attendance already marked.",
        409,
        "ATTENDANCE_ALREADY_MARKED"
      );
    }

    return {
      date,
      attendance: punchSummary(transaction.snapshot.val()),
    };
  } catch (error) {
    await deleteAttendanceImage(uploadedImage);
    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| MUTATION: Punch Out
|--------------------------------------------------------------------------
*/



const punchOutEmployee = async (companyCode, payload, user, imageFile) => {
  const { employeeId, settings, now, date, location, ref, current: existing } =
    await preparePunch(companyCode, payload, user, imageFile);

  const early = getPunchOutRejection(existing, now, date);
  if (early) throw early;

  const uploadedImage = await uploadAttendanceImage({
    companyCode,
    employeeId,
    date,
    action: "punch-out",
    file: imageFile,
  });

  let rejected;

  try {
    const transaction = await ref.transaction((current) => {
      rejected = null;

      /*
       * BUG FIX: the Admin SDK first runs this handler with its LOCAL cache,
       * which is null for a node nobody is listening to. Aborting on null
       * (the old behaviour) rejected every punch out with "No punch-in record
       * found". Returning null lets the server reply with the real value and
       * the handler runs again with it.
       */
      if (current === null) return null;

      rejected = getPunchOutRejection(current, now, date);
      if (rejected) return;

      const punchIn = Number(current.punchIn);

      return {
        ...current,
        employeeId,
        date,
        punchOut: now,
        punchOutTime: formatTime(now, settings.timezone),
        workingHours: calculateWorkingHours(punchIn, now),
        ...(location
          ? {
              location: {
                ...(current.location || {}),
                punchOut: location,
              },
            }
          : {}),
        images: {
          ...(current.images || {}),
          punchOut: uploadedImage,
        },
      };
    });

    if (rejected) throw rejected;

    if (!transaction.committed) {
      throw serviceError(
        "Unable to record punch out. Please try again.",
        409,
        "PUNCH_OUT_CONFLICT"
      );
    }

    // The server confirmed there is no record at all for today.
    if (!transaction.snapshot.exists()) {
      throw getPunchOutRejection(null, now, date);
    }

    return {
      date,
      attendance: punchSummary(transaction.snapshot.val()),
    };
  } catch (error) {
    await deleteAttendanceImage(uploadedImage);
    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| MUTATION: Retake a punch photo
|--------------------------------------------------------------------------
| Replaces the photo of a punch already made TODAY. The punch time, status
| and location are untouched - only the image changes - and `retakenAt`
| keeps the change visible for audit. The old Cloudinary asset is deleted
| once the new one is committed.
|--------------------------------------------------------------------------
*/

const PHOTO_SLOTS = Object.freeze({ in: "punchIn", out: "punchOut" });

const retakePunchPhoto = async (companyCode, payload, user, imageFile) => {
  const slot = PHOTO_SLOTS[String(payload?.type || "")];
  if (!slot) {
    throw serviceError("Photo type must be 'in' or 'out'.", 400, "INVALID_PHOTO_TYPE");
  }

  const { employeeId, now, date, ref, current: existing } =
    await preparePunch(companyCode, { employeeId: payload?.employeeId }, user, imageFile);

  const missingPunch = () =>
    serviceError(
      `There is no ${slot === "punchIn" ? "punch in" : "punch out"} today to update.`,
      409,
      "PUNCH_REQUIRED"
    );

  if (!existing?.[slot]) throw missingPunch();

  const uploadedImage = await uploadAttendanceImage({
    companyCode,
    employeeId,
    date,
    action: `${slot}-retake`,
    file: imageFile,
  });

  let rejected;
  let previousImage = null;

  try {
    const transaction = await ref.transaction((current) => {
      rejected = null;
      if (current === null) return null; // empty local cache - let the server answer

      if (!current[slot]) {
        rejected = missingPunch();
        return;
      }

      previousImage = current.images?.[slot] || null;

      return {
        ...current,
        images: {
          ...(current.images || {}),
          [slot]: { ...uploadedImage, retakenAt: now },
        },
      };
    });

    if (rejected) throw rejected;
    if (!transaction.committed || !transaction.snapshot.exists()) throw missingPunch();
  } catch (error) {
    await deleteAttendanceImage(uploadedImage);
    throw error;
  }

  await deleteAttendanceImage(previousImage);

  return { date, type: payload.type, image: { url: uploadedImage.url } };
};

/*
|--------------------------------------------------------------------------
| MUTATION: Manual Attendance (HR / Owner only)
|--------------------------------------------------------------------------
*/

const saveManualAttendance = async (companyCode, payload, user) => {
  if (![ROLES.OWNER, ROLES.HR].includes(getUserRole(user))) {
    throw serviceError("Only HR or the owner can mark attendance manually.", 403, "ACCESS_DENIED");
  }

  const settings = await loadAttendanceSettings(companyCode);
  const date = String(payload?.date || "");
  validateDate(date, { timezone: settings.timezone });

  const { employeeId } = await assertEmployeeScope(companyCode, payload?.employeeId, user);
  const status = String(payload?.status || "");
  if (!ATTENDANCE_STATUSES.has(status)) {
    throw serviceError("Invalid attendance status.", 400, "INVALID_ATTENDANCE_STATUS");
  }

  const punchIn = parsePunchTime(payload?.punchIn, "Punch in", {
    optional: status === "Absent" || status === "Leave",
  });
  const punchOut = parsePunchTime(payload?.punchOut, "Punch out");
  if (punchOut && !punchIn) throw serviceError("Punch in is required when punch out is provided.", 400, "INVALID_PUNCH_TIME");
  if (punchOut && punchOut <= punchIn) throw serviceError("Punch out must be after punch in.", 400, "INVALID_PUNCH_TIME");

  const now = Date.now();
  const ref = db.ref(recordPath(companyCode, date, employeeId));
  const transaction = await ref.transaction((existing) =>
    buildRecord({
      employeeId, date, punchIn, punchOut, status,
      remarks: String(payload?.remarks || "").trim().slice(0, 1000),
      settings,
      createdAt: existing?.createdAt || now,
      approval: makeApproval({ status: "Approved", by: mutationActor(user), at: now }),
    })
  );

  if (!transaction.committed) throw serviceError("Unable to save attendance.", 409, "ATTENDANCE_WRITE_FAILED");

  const saved = transaction.snapshot.val();
  return {
    updated: Boolean(saved?.createdAt && saved.createdAt !== now),
    attendance: saved,
  };
};

/*
|--------------------------------------------------------------------------
| MUTATION: Attendance Correction (approver applies corrected times)
|--------------------------------------------------------------------------
*/

const updateAttendanceCorrection = async (companyCode, payload, user) => {
  const settings = await loadAttendanceSettings(companyCode);
  const date = String(payload?.date || "");
  validateDate(date, { timezone: settings.timezone });

  const { employeeId } = await assertEmployeeScope(companyCode, payload?.employeeId, user, true);
  const reqIn = parsePunchTime(payload?.requestedPunchIn, "Punch in");
  const reqOut = parsePunchTime(payload?.requestedPunchOut, "Punch out");
  if (!reqIn && !reqOut) throw serviceError("A corrected punch time is required.", 400, "INVALID_PUNCH_TIME");

  const now = Date.now();
  let rejected;
  const ref = db.ref(recordPath(companyCode, date, employeeId));

  const transaction = await ref.transaction((current) => {
    rejected = null;
    // Null may just be the empty local cache: let the server answer (see punch out).
    if (current === null && !reqIn) return null;

    const punchIn = reqIn || current?.punchIn || null;
    const punchOut = reqOut || current?.punchOut || null;
    if (punchOut && (!punchIn || punchOut <= punchIn)) {
      rejected = serviceError("Punch out must be after punch in.", 400, "INVALID_PUNCH_TIME");
      return;
    }

    if (!current) {
      return buildRecord({
        employeeId, date, punchIn, punchOut, status: "Present",
        remarks: String(payload?.reason || "").trim().slice(0, 1000),
        settings,
        approval: makeApproval({ status: "Approved", by: mutationActor(user), at: now }),
        createdAt: now,
      });
    }

    return {
      ...current,
      punchIn,
      punchInTime: punchIn ? formatTime(punchIn, settings.timezone) : "",
      punchOut,
      punchOutTime: punchOut ? formatTime(punchOut, settings.timezone) : "",
      workingHours: calculateWorkingHours(punchIn, punchOut),
      ...(reqIn ? { status: "Present" } : {}),
      ...makeApproval({ status: "Approved", by: mutationActor(user), at: now }),
    };
  });

  if (rejected) throw rejected;
  if (!transaction.committed) throw serviceError("Unable to apply attendance correction.", 409, "ATTENDANCE_WRITE_FAILED");
  if (!transaction.snapshot.exists()) {
    throw serviceError("A punch in time is required to create attendance.", 404, "ATTENDANCE_NOT_FOUND");
  }

  return { success: true };
};

/*
|--------------------------------------------------------------------------
| MUTATION: Approve / Reject a single day
|--------------------------------------------------------------------------
*/

const setAttendanceApproval = async (companyCode, payload, user) => {
  const settings = await loadAttendanceSettings(companyCode);

  const date = String(payload?.date || "");
  validateDate(date, { timezone: settings.timezone });

  const { employeeId } = await assertEmployeeScope(
    companyCode,
    payload?.employeeId,
    user,
    true
  );

  const status = String(payload?.status || "");
  const remarks = String(payload?.remarks || "").trim().slice(0, 1000);

  if (!APPROVAL_STATUSES.has(status)) {
    throw serviceError(
      "A day can only be approved or rejected.",
      400,
      "INVALID_APPROVAL_STATUS"
    );
  }

  if (status === "Rejected" && !remarks) {
    throw serviceError(
      "Remarks are required to reject attendance.",
      400,
      "APPROVAL_REMARK_REQUIRED"
    );
  }

  const now = Date.now();

  const path = recordPath(companyCode, date, employeeId);
  const ref = db.ref(path);

  const snapshot = await ref.once("value");

  if (!snapshot.exists()) {
    throw serviceError(
      "Attendance record not found.",
      404,
      "ATTENDANCE_NOT_FOUND"
    );
  }

  const current = snapshot.val();

  if (getApprovalStatus(current) === status) {
    throw serviceError(
      `This day has already been ${status.toLowerCase()}.`,
      409,
      "INVALID_APPROVAL_TRANSITION"
    );
  }

  const updatedRecord = {
    ...current,
    ...makeApproval({
      status,
      by: mutationActor(user),
      remarks,
      at: now,
    }),
  };

  await ref.set(updatedRecord);

  return {
    success: true,
    attendance: updatedRecord,
  };
};

/*
|--------------------------------------------------------------------------
| MUTATION: Bulk approve a day (multiple employees)
|--------------------------------------------------------------------------
*/

const approveAttendanceDay = async (companyCode, date, employeeIds = [], user) => {
  const settings = await loadAttendanceSettings(companyCode);
  validateDate(date, { timezone: settings.timezone });

  if (!Array.isArray(employeeIds) || employeeIds.length < 1 || employeeIds.length > 500) {
    throw serviceError("Provide between 1 and 500 employee IDs.", 400, "INVALID_EMPLOYEE_IDS");
  }

  const uniqueIds = [...new Set(employeeIds.map(normalizeId))];
  if (uniqueIds.some((id) => !EMPLOYEE_ID_PATTERN.test(id))) {
    throw serviceError("Invalid employee ID.", 400, "INVALID_EMPLOYEE_ID");
  }

  const scopeCache = {};
  await Promise.all(
    uniqueIds.map((id) => assertEmployeeScope(companyCode, id, user, true, scopeCache))
  );

  const snapshots = await Promise.all(
    uniqueIds.map((id) => db.ref(recordPath(companyCode, date, id)).once("value"))
  );

  const approval = makeApproval({ status: "Approved", by: mutationActor(user), at: Date.now() });
  const updates = {};

  snapshots.forEach((snap, i) => {
    if (!snap.exists() || getApprovalStatus(snap.val()) !== "Pending") return;
    for (const [field, value] of Object.entries(approval)) {
      updates[`${getMonthPath(date)}/${date}/${uniqueIds[i]}/${field}`] = value;
    }
  });

  const approved = Object.keys(updates).length / Object.keys(approval).length;
  if (approved) await db.ref(recordsRoot(companyCode)).update(updates);

  return { approved };
};

/*
|--------------------------------------------------------------------------
| MUTATION: Book leave into attendance
|--------------------------------------------------------------------------
*/

const applyLeaveAttendance = async (companyCode, payload, user) => {
  const { employeeId } = await assertEmployeeScope(companyCode, payload?.employeeId, user, true);
  const dateKeys = payload?.dateKeys;
  const status = String(payload?.status || "");
  const leaveRequestId = String(payload?.leaveRequestId || "").trim();

  if (!Array.isArray(dateKeys) || dateKeys.length < 1 || dateKeys.length > 90 || !leaveRequestId) {
    throw serviceError("A leave request and 1 to 90 attendance dates are required.", 400, "INVALID_LEAVE_SYNC");
  }
  if (!new Set(["Leave", "Half Day"]).has(status)) {
    throw serviceError("Invalid leave attendance status.", 400, "INVALID_ATTENDANCE_STATUS");
  }

  const settings = await loadAttendanceSettings(companyCode);
  const dates = [...new Set(dateKeys)];
  dates.forEach((d) => validateDate(d, { allowFuture: true, timezone: settings.timezone }));

  const snapshots = await Promise.all(
    dates.map((d) => db.ref(recordPath(companyCode, d, employeeId)).once("value"))
  );

  const now = Date.now();
  const updates = {};

  snapshots.forEach((snap, i) => {
    const current = snap.val() || null;
    if (current?.leaveRequestId === leaveRequestId) return;

    const d = dates[i];
    updates[`${getMonthPath(d)}/${d}/${employeeId}`] = {
      ...buildRecord({
        employeeId, date: d,
        punchIn: current?.punchIn || null,
        punchOut: current?.punchOut || null,
        status,
        remarks: String(payload?.remarks || "").trim().slice(0, 1000),
        settings,
        approval: makeApproval({ status: "Approved", by: mutationActor(user), at: now }),
        createdAt: current?.createdAt || now,
      }),
      ...(current?.location ? { location: current.location } : {}),
      leaveRequestId,
      leaveStatusBefore: current?.status || "",
    };
  });

  if (Object.keys(updates).length) {
    await db.ref(recordsRoot(companyCode)).update(updates);
  }

  return { success: true, days: Object.keys(updates).length };
};

/*
|--------------------------------------------------------------------------
| MUTATION: Clear leave from attendance (leave cancelled/rejected)
|--------------------------------------------------------------------------
*/

const clearLeaveAttendance = async (companyCode, payload, user) => {
  const { employeeId } = await assertEmployeeScope(companyCode, payload?.employeeId, user, true);
  const dateKeys = payload?.dateKeys;
  const leaveRequestId = String(payload?.leaveRequestId || "").trim();

  if (!Array.isArray(dateKeys) || dateKeys.length < 1 || dateKeys.length > 90 || !leaveRequestId) {
    throw serviceError("A leave request and 1 to 90 attendance dates are required.", 400, "INVALID_LEAVE_SYNC");
  }

  const settings = await loadAttendanceSettings(companyCode);
  const dates = [...new Set(dateKeys)];
  dates.forEach((d) => validateDate(d, { allowFuture: true, timezone: settings.timezone }));

  const snapshots = await Promise.all(
    dates.map((d) => db.ref(recordPath(companyCode, d, employeeId)).once("value"))
  );

  const updates = {};

  snapshots.forEach((snap, i) => {
    const current = snap.val();
    if (current?.leaveRequestId !== leaveRequestId) return;

    const d = dates[i];
    const path = `${getMonthPath(d)}/${d}/${employeeId}`;

    if (!current.punchIn) {
      updates[path] = null;
      return;
    }

    updates[path] = {
      ...buildRecord({
        employeeId, date: d,
        punchIn: current.punchIn,
        punchOut: current.punchOut || null,
        status: current.leaveStatusBefore || "",
        settings,
        approval: makeApproval(),
        createdAt: current.createdAt || Date.now(),
      }),
      ...(current.location ? { location: current.location } : {}),
    };
  });

  if (Object.keys(updates).length) {
    await db.ref(recordsRoot(companyCode)).update(updates);
  }

  return { success: true, days: Object.keys(updates).length };
};

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  /* Reads */
  getDailyAttendance,
  getMonthlyAttendance,
  getEmployeeAttendance,

  /* Mutations */
  punchInEmployee,
  punchOutEmployee,
  retakePunchPhoto,
  saveManualAttendance,
  updateAttendanceCorrection,
  setAttendanceApproval,
  approveAttendanceDay,
  applyLeaveAttendance,
  clearLeaveAttendance,

  /* Shared (used by other services) */
  getAccessibleEmployeeIds,
  getManagedDepartmentIds,
};

