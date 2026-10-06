const db = require("../config/firebase");
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

  const employees = await loadEmployees(companyCode);

  /* Owner / HR → all employees */
  if (role === ROLES.OWNER || role === ROLES.HR) {
    return Object.keys(employees);
  }

  /* Employee → self only */
  if (role === ROLES.EMPLOYEE) {
    const id = getUserEmployeeId(user);
    if (!id) throw serviceError("Employee identity is missing.", 403);

    const actual = Object.keys(employees).find((k) => normalizeId(k) === id);
    if (!actual) throw serviceError("Employee record not found.", 403);

    return [actual];
  }

  /* Manager → employees in managed departments */
  if (role === ROLES.MANAGER) {
    const managerId = getUserEmployeeId(user);
    if (!managerId) throw serviceError("Manager employee identity is missing.", 403);

    const departments = await loadDepartments(companyCode);
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

  const employeeIds = await getAccessibleEmployeeIds(companyCode, user);

  const actualId = employeeIds.find((id) => normalizeId(id) === requestedId);
  if (!actualId) {
    throw serviceError(
      "You do not have permission to view this employee's attendance.",
      403
    );
  }

  const { year: y, month: m, monthName } = validateYearMonth(year, month);

  const path = companyPath(
    companyCode,
    `attendance/records/${y}/${monthName}`
  );

  //Teting Here: Log the existing snapshot for debugging purposes
  const existingSnapshot = await ref.once("value");
  console.log("ATTENDANCE PUNCH OUT DEBUG", {
    companyCode,
    employeeId,
    date,
    timezone: settings.timezone,
    path,
    exists: existingSnapshot.exists(),
    record: existingSnapshot.val(),
  });
  // End of testing log


  const snapshot = await db.ref(path).once("value");
  const monthRecords = snapshot.val() || {};

  /* Extract only this employee's records from each day */
  const records = {};
  for (const [date, daily] of Object.entries(monthRecords)) {
    if (daily?.[actualId]) {
      records[date] = daily[actualId];
    }
  }

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

const assertEmployeeScope = async (companyCode, employeeId, user, approverOnly = false) => {
  const id = normalizeId(employeeId);
  if (!EMPLOYEE_ID_PATTERN.test(id)) {
    throw serviceError("A valid employee ID is required.", 400, "INVALID_EMPLOYEE_ID");
  }

  const role = getUserRole(user);
  if (approverOnly && ![ROLES.OWNER, ROLES.HR, ROLES.MANAGER].includes(role)) {
    throw serviceError("You do not have permission to approve attendance.", 403, "ACCESS_DENIED");
  }

  const employees = await loadEmployees(companyCode);
  const allIds = Object.keys(employees);

  /* Get scoped IDs */
  const scopedIds = await getAccessibleEmployeeIds(companyCode, user);
  const actualId = scopedIds.find((k) => normalizeId(k) === id);

  if (!actualId) {
    const exists = allIds.some((k) => normalizeId(k) === id);
    throw serviceError(
      exists ? "You do not have access to this employee's attendance." : "Employee not found.",
      exists ? 403 : 404,
      exists ? "ACCESS_DENIED" : "EMPLOYEE_NOT_FOUND"
    );
  }

  if (role === ROLES.EMPLOYEE && normalizeId(getUserEmployeeId(user)) !== id) {
    throw serviceError("Employees can only update their own attendance.", 403, "ACCESS_DENIED");
  }

  return { employeeId: actualId, employee: employees[actualId] };
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

const punchInEmployee = async (companyCode, payload, user) => {
  const { employeeId } = await assertEmployeeScope(companyCode, payload?.employeeId, user);
  const settings = await loadAttendanceSettings(companyCode);
  const now = Date.now();
  const date = getDateKey(now, settings.timezone);
  const location = sanitizeLocation(payload?.location, now);
  const ref = db.ref(recordPath(companyCode, date, employeeId));

  let rejected;

  // Temporary production debugging
  const path1 = recordPath(companyCode, date, employeeId);
  const ref1 = db.ref(path1);

  console.log("========== PUNCH IN DEBUG ==========");
  console.log({
    companyCode,
    employeeId,
    date,
    timezone: settings.timezone,
    path: path1,
  });
  console.log("====================================");
  // End of debugging

  const transaction = await ref.transaction((current) => {
    rejected = null;

    if (current) {
      if (current.status === "Leave") {
        rejected = serviceError("You are on approved leave today.", 409, "ATTENDANCE_ON_LEAVE");
        return;
      }
      if (current.status === "Half Day" && current.leaveRequestId && !current.punchIn) {
        return {
          ...current,
          punchIn: now,
          punchInTime: formatTime(now, settings.timezone),
          ...makeApproval({ at: now }),
          ...(location ? { location: { ...(current.location || {}), punchIn: location } } : {}),
        };
      }
      rejected = serviceError("Attendance already marked.", 409, "ATTENDANCE_ALREADY_MARKED");
      return;
    }

    return {
      ...buildRecord({ employeeId, date, punchIn: now, settings, approval: makeApproval({ at: now }) }),
      ...(location ? { location: { punchIn: location } } : {}),
    };
  });

  if (rejected) throw rejected;
  if (!transaction.committed) {
    throw serviceError("Attendance already marked.", 409, "ATTENDANCE_ALREADY_MARKED");
  }

  return { date, attendance: transaction.snapshot.val() };
};

/*
|--------------------------------------------------------------------------
| MUTATION: Punch Out
|--------------------------------------------------------------------------
*/



const punchOutEmployee = async (companyCode, payload, user) => {
  // ---------------------------------------------------------
  // 1. Validate employee scope
  // ---------------------------------------------------------
  const { employeeId } = await assertEmployeeScope(
    companyCode,
    payload?.employeeId,
    user
  );

  // ---------------------------------------------------------
  // 2. Load company attendance settings
  // ---------------------------------------------------------
  const settings = await loadAttendanceSettings(companyCode);

  // ---------------------------------------------------------
  // 3. Server-side timestamp and attendance date
  // ---------------------------------------------------------
  const now = Date.now();

  const date = getDateKey(
    now,
    settings.timezone
  );

  // ---------------------------------------------------------
  // 4. Validate optional location
  // ---------------------------------------------------------
  const location = sanitizeLocation(
    payload?.location,
    now
  );

  // ---------------------------------------------------------
  // 5. Build authoritative Firebase path
  // ---------------------------------------------------------
  const path = recordPath(
    companyCode,
    date,
    employeeId
  );

  const ref = db.ref(path);

  // ---------------------------------------------------------
  // 6. Read today's attendance
  // ---------------------------------------------------------
  const snapshot = await ref.once("value");

  const current = snapshot.val();

  // ---------------------------------------------------------
  // 7. Attendance must exist
  // ---------------------------------------------------------
  if (!current) {
    throw serviceError(
      `No punch-in record found for ${date}.`,
      409,
      "PUNCH_IN_REQUIRED"
    );
  }

  // ---------------------------------------------------------
  // 8. Punch-in must exist
  // ---------------------------------------------------------
  const punchIn = Number(current.punchIn);

  if (!Number.isFinite(punchIn)) {
    throw serviceError(
      `No valid punch-in record found for ${date}.`,
      409,
      "PUNCH_IN_REQUIRED"
    );
  }

  // ---------------------------------------------------------
  // 9. Prevent duplicate punch-out
  // ---------------------------------------------------------
  if (current.punchOut) {
    throw serviceError(
      "Attendance has already been punched out.",
      409,
      "PUNCH_OUT_ALREADY_MARKED"
    );
  }

  // ---------------------------------------------------------
  // 10. Validate punch-out time
  // ---------------------------------------------------------
  if (now <= punchIn) {
    throw serviceError(
      "Punch out must be after punch in.",
      400,
      "INVALID_PUNCH_TIME"
    );
  }
  // ---------------------------------------------------------
  // 11. Calculate working hours on backend
  // ---------------------------------------------------------
  const workingHours = calculateWorkingHours(
    punchIn,
    now
  );
  // ---------------------------------------------------------
  // 12. Build updated attendance record
  // ---------------------------------------------------------
  const updatedRecord = {
    ...current,
    employeeId,
    date,
    punchOut: now,
    punchOutTime: formatTime(
      now,
      settings.timezone
    ),
    workingHours,
    ...(location
      ? {
          location: {
            ...(current.location || {}),
            punchOut: location,
          },
        }
      : {}),
  };
  // ---------------------------------------------------------
  // 13. Save attendance
  // ---------------------------------------------------------
  await ref.set(updatedRecord);
  // ---------------------------------------------------------
  // 14. Return backend result
  // ---------------------------------------------------------
  return {
    date,
    attendance: updatedRecord,
  };
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
    if (!current && !reqIn) {
      rejected = serviceError("A punch in time is required to create attendance.", 404, "ATTENDANCE_NOT_FOUND");
      return;
    }

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

  for (const id of uniqueIds) await assertEmployeeScope(companyCode, id, user, true);

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

