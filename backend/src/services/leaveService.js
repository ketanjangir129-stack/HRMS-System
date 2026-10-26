
const db = require("../config/firebase");
const {
  applyLeaveAttendance,
  clearLeaveAttendance,
} = require("./attendanceService");
const holidayService = require("./holidayService");
const { getDateKey } = require("../utils/attendanceDate");

/*
| Days of the week that are never worked, as `getUTCDay()` numbers. Mirrors
| WEEKLY_OFF_DAYS in frontend/src/utils/holiday/holidayConstants.js - change
| both together, or the balance the modal shows and the one charged drift.
*/
const WEEKLY_OFF_DAYS = [0];

const EMPLOYEE_ID_PATTERN = /^[A-Za-z0-9_-]{1,50}$/;

const LEAVE_ROOT = "leave";
const DEFAULT_SETTINGS = {
  annualLeaves: 12,
  monthlyAccrual: 1,
  allowCarryForward: true,
  maxCarryForward: 5,
};

const ALLOWED_TYPES = ["Single Day", "Multiple Day", "Half Day"];
const ALLOWED_STATUSES = ["Pending", "Approved", "Rejected"];
const MAX_SYNC_DAYS = 90;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fail(message, statusCode = 400, code = "BAD_REQUEST") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  throw error;
}

function companyRoot(companyCode) {
  if (!companyCode || typeof companyCode !== "string") {
    fail("A valid company code is required.", 400);
  }
  return `companies/${companyCode}`;
}

function leavePath(companyCode, suffix = "") {
  return `${companyRoot(companyCode)}/${LEAVE_ROOT}${suffix ? `/${suffix}` : ""}`;
}

function attendanceMonthPath(dateKey) {
  const { year, month } = parseDateKey(dateKey);
  return `${year}/${MONTHS[month - 1]}/${dateKey}`;
}

// Formats a Date built from calendar parts (see inclusiveDateKeys). Not for
// "today": the server clock may be UTC, which is yesterday in India until
// 05:30 - use todayKey() for that.
function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Today in the company's timezone (Asia/Kolkata), whatever the server runs on.
function todayKey() {
  return getDateKey(Date.now());
}

function parseDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    fail("Dates must use YYYY-MM-DD format.");
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    fail(`Invalid calendar date: ${value}`);
  }

  return { year, month, day, date };
}

function inclusiveDateKeys(fromDate, toDate = fromDate) {
  const from = parseDateKey(fromDate).date;
  const to = parseDateKey(toDate).date;

  if (to < from) fail("The end date cannot be before the start date.");

  const keys = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  while (cursor <= to) {
    keys.push(localDateKey(cursor));
    if (keys.length > MAX_SYNC_DAYS) {
      fail(`A leave request cannot exceed ${MAX_SYNC_DAYS} calendar days.`);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

function calculateDays(request) {
  if (!ALLOWED_TYPES.includes(request.requestType)) {
    fail("Invalid leave request type.");
  }

  if (request.requestType === "Half Day") {
    if (!request.halfDaySession) {
      fail("Select a session for half-day leave.");
    }
    if (!["Before Lunch", "After Lunch"].includes(request.halfDaySession)) {
      fail("Invalid half-day session.");
    }
    return 0.5;
  }

  if (request.requestType === "Single Day") return 1;

  return inclusiveDateKeys(request.fromDate, request.toDate).length;
}

function validateReason(reason) {
  if (typeof reason !== "string" || reason.trim().length < 10) {
    fail("Leave reason must contain at least 10 characters.");
  }
  return reason.trim();
}

function validateDates(request, { allowPast = false } = {}) {
  const from = parseDateKey(request.fromDate).date;
  const to = parseDateKey(
    request.requestType === "Multiple Day"
      ? request.toDate
      : request.fromDate
  ).date;

  if (to < from) fail("The end date cannot be before the start date.");

  if (!allowPast && localDateKey(from) < todayKey()) {
    fail("Leave cannot be requested for a past date.");
  }

  if (request.requestType === "Multiple Day") {
    inclusiveDateKeys(request.fromDate, request.toDate);
  }
}

/*
|--------------------------------------------------------------------------
| Working days
|--------------------------------------------------------------------------
| A declared holiday or a weekly off inside a range is not charged as leave
| and not written onto attendance as "Leave" - the office was shut anyway.
| This is the same rule the apply modal prices with (calculateLeaveDays), and
| the server is now the one that decides: the client's `days` is ignored.
*/

function isWeeklyOff(dateKey) {
  const { year, month, day } = parseDateKey(dateKey);
  return WEEKLY_OFF_DAYS.includes(new Date(Date.UTC(year, month - 1, day)).getUTCDay());
}

async function loadHolidayDates(companyCode, dateKeys) {
  const years = [...new Set(dateKeys.map((key) => key.slice(0, 4)))];

  const lists = await Promise.all(
    years.map((year) =>
      holidayService.listHolidays(companyCode, year).catch((error) => {
        // Same stance as the frontend: an unreadable holiday calendar must
        // not block leave, it just prices the range without holidays.
        console.error("Leave: failed to load holidays:", error?.message);
        return [];
      })
    )
  );

  return new Set(lists.flat().map((holiday) => holiday?.date).filter(Boolean));
}

async function getWorkingDateKeys(companyCode, fromDate, toDate = fromDate) {
  const keys = inclusiveDateKeys(fromDate, toDate);
  const holidays = await loadHolidayDates(companyCode, keys);
  return keys.filter((key) => !holidays.has(key) && !isWeeklyOff(key));
}

async function calculateWorkingDays(companyCode, request) {
  // Validates the type and the half-day session.
  calculateDays(request);

  const working = await getWorkingDateKeys(companyCode, request.fromDate, request.toDate);

  if (request.requestType === "Half Day") return working.length ? 0.5 : 0;

  return working.length;
}

/*
| Only the fields a leave request is made of are kept. Spreading the client's
| body onto the stored record let anything it sent be written to the database.
*/
async function normalizeRequest(
  companyCode,
  input,
  { allowPast = false, validateReasonText = true } = {}
) {
  const requestType = input.requestType;
  const fromDate = input.fromDate;
  const toDate = requestType === "Multiple Day" ? input.toDate : fromDate;

  if (!fromDate) fail("Start date is required.");

  const reason = validateReasonText
    ? validateReason(input.reason)
    : String(input.reason || "").trim();

  const normalized = {
    requestType,
    fromDate,
    toDate,
    halfDaySession: requestType === "Half Day" ? String(input.halfDaySession || "") : "",
    reason,
  };

  validateDates(normalized, { allowPast });

  normalized.days = await calculateWorkingDays(companyCode, normalized);

  if (normalized.days <= 0) {
    fail("The selected range has no working days. Holidays and weekly offs do not need a leave request.");
  }

  return normalized;
}

function normalizeRole(user) {
  return String(user?.role || "").toLowerCase();
}

function requireRole(user, allowed) {
  if (!user || !allowed.includes(normalizeRole(user))) {
    fail("You are not authorized to perform this action.", 403);
  }
}

function isSameEmployee(a, b) {
  return Boolean(a && b) && String(a).toUpperCase() === String(b).toUpperCase();
}

// Nobody but the owner decides their own leave: HR's goes to the owner and a
// manager's to HR. The attendance sync enforces the same rule.
function assertNotSelfApproval(user, employeeId) {
  if (normalizeRole(user) !== "owner" && isSameEmployee(employeeId, user?.employeeId)) {
    fail("You cannot approve, reject or remove your own approved leave.", 403);
  }
}

function requestStatus(request) {
  return String(request?.status || "Pending");
}

function requestIdOf(request, key) {
  return request?.requestId || key;
}

function makeRequestRef(companyCode, appliedDate, employeeId, requestId) {
  return db.ref(
    leavePath(
      companyCode,
      `requests/${parseDateKey(appliedDate).year}/${
        MONTHS[parseDateKey(appliedDate).month - 1]
      }/${appliedDate}/${employeeId}/${requestId}`
    )
  );
}

/*
| Short-lived read caches, one entry per company. A single shared slot was
| thrown away whenever a second company made a request, so with two busy
| companies neither ever hit the cache.
*/
const requestsCache = new Map(); // companyCode -> { timestamp, data }
const settingsCache = new Map(); // companyCode -> { timestamp, data }

const CACHE_TTL_MS = 4000;

const readCache = (cache, companyCode) => {
  const entry = cache.get(companyCode);
  return entry && Date.now() - entry.timestamp < CACHE_TTL_MS ? entry.data : null;
};

function invalidateRequestsCache(companyCode) {
  if (companyCode) requestsCache.delete(companyCode);
  else requestsCache.clear();
}

function invalidateSettingsCache(companyCode) {
  if (companyCode) settingsCache.delete(companyCode);
  else settingsCache.clear();
}

function sanitizeApprover(approvedBy, ownerName = "Owner") {
  if (!approvedBy || typeof approvedBy !== "string") return approvedBy || "";
  const trimmed = approvedBy.trim();
  if (trimmed.toLowerCase() === "owner") return ownerName || "Owner";
  // If it's a raw Firebase UID (length >= 20 without spaces, not an employee ID)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed) && !trimmed.startsWith("EMP") && !trimmed.startsWith("HR")) {
    return ownerName || "Owner";
  }
  return trimmed;
}

async function getCompanyOwnerName(companyCode) {
  try {
    const snap = await db.ref(`companies/${companyCode}/details/ownerName`).once("value");
    return snap.val() || "Owner";
  } catch (_) {
    return "Owner";
  }
}

async function getApproverIdentity(companyCode, user, payload = {}) {
  const incoming = String(payload.approver || payload.approverName || "").trim();
  if (incoming && !/^[a-zA-Z0-9_-]{24,}$/.test(incoming)) {
    return incoming;
  }

  const role = normalizeRole(user);
  if (role === "owner" || !user.employeeId) {
    const ownerName = await getCompanyOwnerName(companyCode);
    return ownerName || "Owner";
  }

  if (user.employeeId) {
    try {
      const snap = await db
        .ref(`companies/${companyCode}/employees/${user.employeeId}/personalInfo/name`)
        .once("value");
      const name = snap.val();
      if (name && typeof name === "string" && name.trim()) {
        return name.trim();
      }
    } catch (_) {}
    return user.employeeId;
  }

  return "Admin";
}

async function readAllRequests(companyCode) {
  const cached = readCache(requestsCache, companyCode);
  if (cached) return cached;

  const [snapshot, ownerSnap] = await Promise.all([
    db.ref(leavePath(companyCode, "requests")).once("value"),
    db.ref(`companies/${companyCode}/details/ownerName`).once("value").catch(() => null),
  ]);

  const root = snapshot.val() || {};
  const ownerName = ownerSnap?.val?.() || "Owner";
  const results = [];

  // Expected structure:
  // requests/{year}/{Month}/{appliedDate}/{employeeId}/{requestId}
  for (const [yearKey, months] of Object.entries(root)) {
    if (!months || typeof months !== "object") continue;

    for (const [monthName, dates] of Object.entries(months)) {
      if (!dates || typeof dates !== "object") continue;

      for (const [appliedDate, employees] of Object.entries(dates)) {
        if (!employees || typeof employees !== "object") continue;

        for (const [employeeId, requestBucket] of Object.entries(employees)) {
          if (!requestBucket || typeof requestBucket !== "object") continue;

          const isRequest =
            typeof requestBucket.requestId === "string" ||
            typeof requestBucket.employeeId === "string" ||
            typeof requestBucket.fromDate === "string";

          if (isRequest) {
            const cleanRequest = {
              ...requestBucket,
              approvedBy: sanitizeApprover(requestBucket.approvedBy, ownerName),
            };
            results.push({
              request: cleanRequest,
              requestId: requestIdOf(requestBucket, null),
              employeeId: requestBucket.employeeId || employeeId,
              appliedDate: requestBucket.appliedDate || appliedDate,
              legacy: true,
              ref: db.ref(
                leavePath(
                  companyCode,
                  `requests/${yearKey}/${monthName}/${appliedDate}/${employeeId}`
                )
              ),
            });
            continue;
          }

          for (const [requestKey, value] of Object.entries(requestBucket)) {
            if (!value || typeof value !== "object") continue;
            if (
              typeof value.requestId !== "string" &&
              typeof value.employeeId !== "string" &&
              typeof value.fromDate !== "string"
            ) continue;

            const cleanRequest = {
              ...value,
              approvedBy: sanitizeApprover(value.approvedBy, ownerName),
            };

            results.push({
              request: cleanRequest,
              requestId: requestIdOf(value, requestKey),
              employeeId: value.employeeId || employeeId,
              appliedDate: value.appliedDate || appliedDate,
              legacy: false,
              ref: db.ref(
                leavePath(
                  companyCode,
                  `requests/${yearKey}/${monthName}/${appliedDate}/${employeeId}/${requestKey}`
                )
              ),
            });
          }
        }
      }
    }
  }

  requestsCache.set(companyCode, { timestamp: Date.now(), data: results });

  return results;
}

async function findRequest(companyCode, requestId, employeeId) {
  if (!requestId) fail("Request ID is required.");

  const all = await readAllRequests(companyCode);
  const matches = all.filter((item) =>
    (item.requestId === requestId ||
      item.request?.id === requestId ||
      item.request?.requestId === requestId) &&
    (!employeeId || item.employeeId === employeeId)
  );

  if (matches.length === 0) fail("Leave request not found.", 404);

  return matches[0];
}

async function getSettings(companyCode) {
  const cached = readCache(settingsCache, companyCode);
  if (cached) return cached;

  const ref = db.ref(leavePath(companyCode, "settings"));
  const snapshot = await ref.once("value");

  let settings;
  if (!snapshot.exists()) {
    await ref.transaction((current) => current || DEFAULT_SETTINGS);
    const created = await ref.once("value");
    settings = { ...DEFAULT_SETTINGS, ...(created.val() || {}) };
  } else {
    settings = { ...DEFAULT_SETTINGS, ...(snapshot.val() || {}) };
  }

  settingsCache.set(companyCode, { timestamp: Date.now(), data: settings });

  return settings;
}

async function getUsage(companyCode, year, employeeId) {
  const snapshot = await db.ref(
    leavePath(companyCode, `usage/${year}/${employeeId}`)
  ).once("value");

  return {
    used: 0,
    lwp: 0,
    carryForward: 0,
    ...(snapshot.val() || {}),
  };
}

/*
|--------------------------------------------------------------------------
| Month-wise paid leave
|--------------------------------------------------------------------------
| Every month has its own paid allowance (`monthlyAccrual`, 1 by default).
| A leave day is paid while its own month still has room for it (a whole day,
| or half a day for a half-day leave); every other day is leave without pay.
| Unused allowance lapses at month end - it does not move to the next month.
|
| Paid days per month are kept in usage/{year}/{employeeId}/months/{MM} and
| unpaid (LWP) days in .../lwpMonths/{MM}. These are the single source of
| truth for the month-wise view - the UI reads them, it does not recompute.
*/
function monthlyPaidLimit(settings) {
  return Math.max(0, Number(settings?.monthlyAccrual) || 0);
}

const monthOf = (dateKey) => dateKey.slice(5, 7);

function splitByMonth(dateKeys, dayCost, usedByMonth, limit) {
  const used = { ...(usedByMonth || {}) };
  const paidKeys = [];
  const unpaidKeys = [];

  for (const key of dateKeys) {
    const month = monthOf(key);
    const spent = Number(used[month]) || 0;

    if (limit - spent >= dayCost) {
      paidKeys.push(key);
      used[month] = spent + dayCost;
    } else {
      unpaidKeys.push(key);
    }
  }

  return { paidKeys, unpaidKeys };
}

// Paid leave still free in the current month (IST), for the given year.
function currentMonthAvailable(settings, usage, year) {
  const [currentYear, currentMonth] = todayKey().split("-");
  const limit = monthlyPaidLimit(settings);

  if (Number(year) !== Number(currentYear)) return limit;

  return Math.max(0, limit - (Number(usage?.months?.[currentMonth]) || 0));
}

function groupByYear(dateKeys) {
  const groups = new Map();
  for (const key of dateKeys) {
    const year = Number(key.slice(0, 4));
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(key);
  }
  return groups;
}

async function pendingDaysForYear(companyCode, employeeId, year, excludeId) {
  const requests = await readAllRequests(companyCode);
  return requests.reduce((sum, item) => {
    if (item.employeeId !== employeeId) return sum;
    if (item.requestId === excludeId) return sum;
    if (requestStatus(item.request) !== "Pending") return sum;

    const fromDate = item.request.fromDate;
    if (!fromDate || parseDateKey(fromDate).year !== Number(year)) return sum;

    return sum + (Number(item.request.days) || 0);
  }, 0);
}

/*
| Leave is never refused for want of balance: the employee may apply for as
| many days as they need and the approver decides. On approval each day is
| paid if its month still has paid leave left, otherwise it is leave without
| pay (LWP) - see splitByMonth.
*/

async function getLeaveRequests(companyCode, user) {
  const requests = await readAllRequests(companyCode);
  const role = normalizeRole(user);

  if (role === "employee") {
    return requests
      .filter((item) => item.employeeId === user.employeeId)
      .map(({ request, requestId, employeeId, appliedDate }) => ({
        ...request,
        requestId,
        employeeId,
        appliedDate,
      }));
  }

  if (role === "manager") {
    try {
      const { getAccessibleEmployeeIds } = require("./attendanceService");
      const accessibleIds = await getAccessibleEmployeeIds(companyCode, user);
      const accessibleSet = new Set(accessibleIds);

      return requests
        .filter(
          (item) =>
            accessibleSet.has(item.employeeId) ||
            item.employeeId === user.employeeId
        )
        .map(({ request, requestId, employeeId, appliedDate }) => ({
          ...request,
          requestId,
          employeeId,
          appliedDate,
        }));
    } catch (_) {
      return requests
        .filter((item) => item.employeeId === user.employeeId)
        .map(({ request, requestId, employeeId, appliedDate }) => ({
          ...request,
          requestId,
          employeeId,
          appliedDate,
        }));
    }
  }

  return requests.map(({ request, requestId, employeeId, appliedDate }) => ({
    ...request,
    requestId,
    employeeId,
    appliedDate,
  }));
}

async function createLeaveRequest({ companyCode, user, payload }) {
  requireRole(user, ["employee", "owner", "hr", "manager"]);

  const role = normalizeRole(user);
  const employeeId =
    role === "employee" ? user.employeeId : payload.employeeId || user.employeeId;

  if (!employeeId) fail("An employee is required to raise a leave request.");

  // The id becomes part of the database path, so it must be a plain id.
  if (!EMPLOYEE_ID_PATTERN.test(String(employeeId))) {
    fail("A valid employee ID is required.");
  }

  // Raising leave for somebody else is an approver's act, inside their scope.
  if (!isSameEmployee(employeeId, user.employeeId)) {
    await validateApproverScope(companyCode, user, employeeId);
  }

  const allowPast = ["owner", "hr", "manager"].includes(role);
  const normalized = await normalizeRequest(companyCode, payload, { allowPast });

  const appliedDate = todayKey();
  const generatedKey = db.ref().push().key;
  const requestId = `REQ_${generatedKey}`;

  const request = {
    ...normalized,
    employeeId,
    requestId,
    appliedDate,
    status: "Pending",
    requestedAt: Date.now(),
    approvedBy: "",
    approvedAt: null,
    remarks: "",
  };

  const ref = makeRequestRef(companyCode, appliedDate, employeeId, requestId);
  await ref.set(request);
  invalidateRequestsCache(companyCode);

  return { success: true, requestId, request };
}

async function updateLeaveRequest({ companyCode, user, requestId, payload }) {
  const item = await findRequest(companyCode, requestId);
  const role = normalizeRole(user);

  if (role === "employee" && item.employeeId !== user.employeeId) {
    fail("You are not authorized to update this leave request.", 403);
  }

  if (requestStatus(item.request) !== "Pending") {
    fail("Only pending leave requests can be edited.", 409);
  }

  const allowPast = ["owner", "hr", "manager"].includes(role);
  const normalized = await normalizeRequest(
    companyCode,
    {
      ...item.request,
      ...payload,
      employeeId: item.employeeId,
    },
    { allowPast }
  );

  const updates = {
    requestType: normalized.requestType,
    fromDate: normalized.fromDate,
    toDate: normalized.toDate,
    days: normalized.days,
    halfDaySession: normalized.halfDaySession || "",
    reason: normalized.reason,
    updatedAt: Date.now(),
  };

  await item.ref.update(updates);
  invalidateRequestsCache(companyCode);

  const updatedSnap = await item.ref.once("value");
  return { success: true, request: updatedSnap.val() };
}

// Usage and idempotency marker are stored in the SAME usage node.
// Repeated calls for the same request will not apply the delta twice.
//
// One call per year node: a range crossing 31 Dec is booked in both years.
//
// On "apply" the month-wise paid / unpaid split is decided inside the
// transaction, from the months as they stand at that moment, so two
// approvals at once cannot both spend the same month's paid leave. `split`
// fixes it instead (used to restore a split that was released). `legacyDays`
// releases a marker written before month-wise booking. Returns this
// request's marker in this year, or null.
async function changeUsageOnce(
  companyCode,
  year,
  employeeId,
  requestId,
  action,
  { dateKeys = [], dayCost = 1, settings = null, split = null, legacyDays = 0 } = {}
) {
  const ref = db.ref(leavePath(companyCode, `usage/${year}/${employeeId}`));

  const result = await ref.transaction((current) => {
    const existing = current?.transactions?.[requestId];

    // Nothing of this request was booked in this year.
    if (action === "release" && !existing && !legacyDays) return current;

    const usage = {
      used: 0,
      lwp: 0,
      carryForward: 0,
      ...(current || {}),
    };

    usage.transactions = { ...(usage.transactions || {}) };
    usage.months = { ...(usage.months || {}) };
    usage.lwpMonths = { ...(usage.lwpMonths || {}) };
    const marker = usage.transactions[requestId];

    const addTo = (bucket, keys, delta) => keys.forEach((key) => {
      const month = monthOf(key);
      bucket[month] = Math.max(0, (Number(bucket[month]) || 0) + delta);
    });

    if (action === "apply") {
      if (marker?.applied) return usage;

      const { paidKeys, unpaidKeys } = split
        || (settings
          ? splitByMonth(dateKeys, dayCost, usage.months, monthlyPaidLimit(settings))
          : { paidKeys: dateKeys, unpaidKeys: [] });

      addTo(usage.months, paidKeys, dayCost);
      addTo(usage.lwpMonths, unpaidKeys, dayCost);

      // A restored pre-month-wise marker has totals but no dates.
      const paid = split?.paid != null ? Number(split.paid) || 0 : paidKeys.length * dayCost;
      const unpaid = split?.unpaid != null ? Number(split.unpaid) || 0 : unpaidKeys.length * dayCost;

      usage.used = Math.max(0, Number(usage.used) + paid);
      usage.lwp = Math.max(0, (Number(usage.lwp) || 0) + unpaid);
      usage.transactions[requestId] = {
        days: paid + unpaid,
        paid,
        unpaid,
        dayCost,
        paidKeys,
        unpaidKeys,
        applied: true,
        updatedAt: Date.now(),
      };
      return usage;
    }

    if (action === "release") {
      if (marker && marker.applied === false) return usage;

      const cost = Number(marker?.dayCost) || dayCost;
      const paidKeys = marker?.paidKeys || [];
      const unpaidKeys = marker?.unpaidKeys || [];
      const isMonthWise = Boolean(marker?.paidKeys || marker?.unpaidKeys);

      // Markers from before month-wise booking only carry totals.
      const paid = isMonthWise
        ? paidKeys.length * cost
        : Number(marker?.paid ?? marker?.days ?? legacyDays) || 0;
      const unpaid = isMonthWise
        ? unpaidKeys.length * cost
        : Number(marker?.unpaid) || 0;

      addTo(usage.months, paidKeys, -cost);
      addTo(usage.lwpMonths, unpaidKeys, -cost);

      usage.used = Math.max(0, Number(usage.used) - paid);
      usage.lwp = Math.max(0, (Number(usage.lwp) || 0) - unpaid);
      usage.transactions[requestId] = {
        ...(marker || {}),
        days: paid + unpaid,
        paid,
        unpaid,
        applied: false,
        updatedAt: Date.now(),
      };
      return usage;
    }

    return usage;
  });

  if (!result.committed) fail("Leave usage could not be updated. Please retry.", 409);
  return result.snapshot.val()?.transactions?.[requestId] || null;
}

// Writes the paid and the unpaid days separately, so each record says which
// it is and payroll can deduct the unpaid ones.
async function bookLeaveAttendance(companyCode, user, { employeeId, requestId, request, paidKeys, unpaidKeys }) {
  const isHalfDay = request.requestType === "Half Day";
  const base = {
    employeeId,
    leaveRequestId: requestId,
    status: isHalfDay ? "Half Day" : "Leave",
  };
  const label = isHalfDay
    ? `half day leave · ${request.halfDaySession || ""}`
    : "leave";

  if (paidKeys.length) {
    await applyLeaveAttendance(
      companyCode,
      { ...base, dateKeys: paidKeys, paid: true, remarks: `Approved ${label}` },
      user
    );
  }

  if (unpaidKeys.length) {
    await applyLeaveAttendance(
      companyCode,
      { ...base, dateKeys: unpaidKeys, paid: false, remarks: `Approved ${label} (unpaid - LWP)` },
      user
    );
  }
}

/*
| Changes a request's status atomically, so two approvers acting at once
| cannot both succeed (one approves while the other rejects).
|
| `callback(current)` returns the next record, or throws to refuse. The Admin
| SDK first runs the handler against its local cache, which is null for a
| node nobody listens to; returning null there lets the server answer with
| the real value instead of aborting (see punchOutEmployee).
*/
async function transitionRequest(item, callback) {
  let refused = null;

  const result = await item.ref.transaction((current) => {
    refused = null;
    if (current === null) return null;
    try {
      return callback(current);
    } catch (error) {
      refused = error;
      return; // abort
    }
  });

  if (refused) throw refused;

  if (!result.snapshot.exists()) fail("Leave request not found.", 404);

  if (!result.committed) {
    fail("The leave request was changed by another user. Refresh and retry.", 409);
  }

  return result.snapshot.val();
}

const requirePending = (action) => (current) => {
  if (requestStatus(current) !== "Pending") {
    fail(`Only pending leave requests can be ${action}. Refresh and retry.`, 409);
  }
};

async function validateApproverScope(companyCode, user, employeeId) {
  const role = normalizeRole(user);
  requireRole(user, ["owner", "hr", "manager"]);

  if (role === "owner" || role === "hr") return;

  // Manager scope is enforced again by attendanceService during attendance sync.
  // Check it before changing the request status to fail early.
  const { getAccessibleEmployeeIds } = require("./attendanceService");
  const ids = await getAccessibleEmployeeIds(companyCode, user);

  if (!ids.includes(employeeId)) {
    fail("You are not authorized to access this employee's leave request.", 403);
  }
}

async function approveLeaveRequest({ companyCode, user, requestId, payload = {} }) {
  const remarks = payload.remarks || "";
  const item = await findRequest(companyCode, requestId);
  assertNotSelfApproval(user, item.employeeId);
  await validateApproverScope(companyCode, user, item.employeeId);

  const request = item.request;
  if (requestStatus(request) !== "Pending") {
    fail("Only pending leave requests can be approved.", 409);
  }

  // Days are re-priced on the server at approval time (holidays may have
  // been declared since the request was raised).
  const normalized = await normalizeRequest(companyCode, request, {
    allowPast: true,
    validateReasonText: false,
  });
  const settings = await getSettings(companyCode);
  const dayCost = normalized.requestType === "Half Day" ? 0.5 : 1;

  // Attendance is marked only on working days: a holiday or weekly off inside
  // the range was not charged, so it is not written as "Leave" either.
  // Rollback / clear still uses the full range - clearing only touches days
  // that carry this request's id.
  const dateKeys = inclusiveDateKeys(normalized.fromDate, normalized.toDate);
  const workingDateKeys = await getWorkingDateKeys(
    companyCode,
    normalized.fromDate,
    normalized.toDate
  );
  const appliedYears = [];
  let statusChanged = false;

  const approverName = await getApproverIdentity(companyCode, user, payload);

  try {
    await transitionRequest(item, (current) => {
      requirePending("approved")(current);
      return {
        ...current,
        days: normalized.days,
        status: "Approved",
        approvedBy: approverName,
        approvedAt: Date.now(),
        remarks: String(remarks || "").trim(),
        approvalState: "complete",
        approvalCompletedAt: Date.now(),
      };
    });
    statusChanged = true;

    // Month-wise: each day is paid only while its month has paid leave left.
    const paidKeys = [];
    const unpaidKeys = [];

    for (const [year, keys] of groupByYear(workingDateKeys)) {
      const marker = await changeUsageOnce(
        companyCode,
        year,
        item.employeeId,
        item.requestId,
        "apply",
        { dateKeys: keys, dayCost, settings }
      );
      appliedYears.push(year);
      paidKeys.push(...(marker?.paidKeys || []));
      unpaidKeys.push(...(marker?.unpaidKeys || []));
    }

    await item.ref.update({
      paidDays: paidKeys.length * dayCost,
      unpaidDays: unpaidKeys.length * dayCost,
    });

    await bookLeaveAttendance(companyCode, user, {
      employeeId: item.employeeId,
      requestId: item.requestId,
      request: normalized,
      paidKeys,
      unpaidKeys,
    });

    const updatedSnap = await item.ref.once("value");
    invalidateRequestsCache(companyCode);
    return { success: true, request: updatedSnap.val() };
  } catch (error) {
    // Lost the race to another approver: nothing of ours was written.
    if (!statusChanged) {
      invalidateRequestsCache(companyCode);
      throw error;
    }

    try {
      await clearLeaveAttendance(
        companyCode,
        { employeeId: item.employeeId, dateKeys, leaveRequestId: item.requestId },
        user
      );
    } catch (_) {}

    for (const year of appliedYears) {
      try {
        await changeUsageOnce(
          companyCode,
          year,
          item.employeeId,
          item.requestId,
          "release",
          { dayCost }
        );
      } catch (_) {}
    }

    try {
      await item.ref.update({
        status: "Pending",
        approvedBy: "",
        approvedAt: null,
        paidDays: null,
        unpaidDays: null,
        approvalState: "failed",
        approvalErrorAt: Date.now(),
      });
    } catch (_) {}

    invalidateRequestsCache(companyCode);
    throw error;
  }
}

async function rejectLeaveRequest({ companyCode, user, requestId, payload = {}, remarks }) {
  const item = await findRequest(companyCode, requestId);
  assertNotSelfApproval(user, item.employeeId);
  await validateApproverScope(companyCode, user, item.employeeId);

  const rejectionRemarks = String(payload.remarks || remarks || "").trim();
  if (!rejectionRemarks) {
    fail("A rejection reason is required.");
  }

  if (requestStatus(item.request) !== "Pending") {
    fail("Only pending leave requests can be rejected.", 409);
  }

  const approverName = await getApproverIdentity(companyCode, user, payload);

  try {
    const updated = await transitionRequest(item, (current) => {
      requirePending("rejected")(current);
      return {
        ...current,
        status: "Rejected",
        approvedBy: approverName,
        approvedAt: Date.now(),
        remarks: rejectionRemarks,
      };
    });

    return { success: true, request: updated };
  } finally {
    invalidateRequestsCache(companyCode);
  }
}

async function deleteLeaveRequest({ companyCode, user, requestId }) {
  const item = await findRequest(companyCode, requestId);
  const role = normalizeRole(user);

  if (role === "employee" && item.employeeId !== user.employeeId) {
    fail("You are not authorized to delete this leave request.", 403);
  }

  if (!["employee", "owner", "hr", "manager"].includes(role)) {
    fail("You are not authorized to delete this leave request.", 403);
  }

  const request = item.request;
  const status = requestStatus(request);

  if (status === "Pending" || status === "Rejected") {
    await item.ref.remove();
    invalidateRequestsCache(companyCode);
    return { success: true, deleted: true };
  }

  if (status !== "Approved") {
    fail("This request cannot be deleted in its current state.", 409);
  }

  // Approved deletion is restricted to authorized approvers - and, like
  // approving, not on one's own leave (it hands the days back).
  assertNotSelfApproval(user, item.employeeId);
  await validateApproverScope(companyCode, user, item.employeeId);

  const fromDate = request.fromDate;
  const toDate =
    request.requestType === "Multiple Day" ? request.toDate : fromDate;
  const fromYear = parseDateKey(fromDate).year;
  const dateKeys = inclusiveDateKeys(fromDate, toDate);
  const days =
    Number(request.days) ||
    (request.requestType === "Half Day" ? 0.5 : dateKeys.length);
  const dayCost = request.requestType === "Half Day" ? 0.5 : 1;
  const years = [...groupByYear(dateKeys).keys()];

  let attendanceCleared = false;
  const released = []; // { year, marker }

  try {
    await clearLeaveAttendance(
      companyCode,
      { employeeId: item.employeeId, dateKeys, leaveRequestId: item.requestId },
      user
    );
    attendanceCleared = true;

    for (const year of years) {
      const marker = await changeUsageOnce(
        companyCode,
        year,
        item.employeeId,
        item.requestId,
        "release",
        // Leave approved before markers existed is all in its start year.
        { dayCost, legacyDays: year === fromYear ? days : 0 }
      );
      released.push({ year, marker });
    }

    await item.ref.remove();
    invalidateRequestsCache(companyCode);
    return { success: true, deleted: true };
  } catch (error) {
    // Restore the accounting and attendance when possible.
    const paidKeys = [];
    const unpaidKeys = [];
    let monthWise = false;

    for (const { year, marker } of released) {
      if (!marker) continue;
      const isMonthWise = Boolean(marker.paidKeys || marker.unpaidKeys);
      monthWise = monthWise || isMonthWise;
      paidKeys.push(...(marker.paidKeys || []));
      unpaidKeys.push(...(marker.unpaidKeys || []));

      try {
        await changeUsageOnce(
          companyCode,
          year,
          item.employeeId,
          item.requestId,
          "apply",
          {
            dayCost: Number(marker.dayCost) || dayCost,
            split: isMonthWise
              ? { paidKeys: marker.paidKeys || [], unpaidKeys: marker.unpaidKeys || [] }
              : { paidKeys: [], unpaidKeys: [], paid: marker.paid ?? marker.days ?? days, unpaid: marker.unpaid ?? 0 },
          }
        );
      } catch (_) {}
    }

    if (attendanceCleared) {
      try {
        await bookLeaveAttendance(companyCode, user, {
          employeeId: item.employeeId,
          requestId: item.requestId,
          request,
          // Pre-month-wise leave kept no dates: book the range as paid.
          paidKeys: monthWise ? paidKeys : dateKeys,
          unpaidKeys: monthWise ? unpaidKeys : [],
        });
      } catch (_) {}
    }

    invalidateRequestsCache(companyCode);
    throw error;
  }
}

async function updateLeaveSettings({ companyCode, user, payload }) {
  requireRole(user, ["owner", "hr"]);

  const current = await getSettings(companyCode);
  const next = { ...current, ...payload };

  for (const key of ["annualLeaves", "monthlyAccrual", "maxCarryForward"]) {
    const value = Number(next[key]);
    if (!Number.isFinite(value) || value < 0) {
      fail(`${key} must be a non-negative number.`);
    }
    next[key] = value;
  }

  next.allowCarryForward = Boolean(next.allowCarryForward);

  await db.ref(leavePath(companyCode, "settings")).update(next);
  invalidateSettingsCache(companyCode);
  return { success: true, settings: next };
}

async function getLeaveUsage({ companyCode, user, year, employeeId }) {
  const targetEmployeeId = normalizeRole(user) === "employee"
    ? user.employeeId
    : employeeId;

  if (!targetEmployeeId) fail("Employee ID is required.");

  // A manager reading their own balance needs no department scope.
  if (
    normalizeRole(user) === "manager" &&
    !isSameEmployee(targetEmployeeId, user.employeeId)
  ) {
    await validateApproverScope(companyCode, user, targetEmployeeId);
  }

  const [usage, settings, pendingDays] = await Promise.all([
    getUsage(companyCode, year, targetEmployeeId),
    getSettings(companyCode),
    pendingDaysForYear(companyCode, targetEmployeeId, year),
  ]);

  return {
    success: true,
    year: Number(year),
    employeeId: targetEmployeeId,
    usage,
    settings,
    pendingDays,
    monthlyLimit: monthlyPaidLimit(settings),
    // Paid leave still free in the current month (month-wise allowance).
    available: currentMonthAvailable(settings, usage, year),
  };
}

module.exports = {
  getLeaveRequests,
  createLeaveRequest,
  updateLeaveRequest,
  deleteLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  getSettings,
  updateLeaveSettings,
  getLeaveUsage,
  // For scripts/rebuildMonthlyLeaveUsage.js - the same rules approval uses.
  monthWise: {
    getWorkingDateKeys,
    splitByMonth,
    monthlyPaidLimit,
    monthOf,
    groupByYear,
    leavePath,
  },
};
