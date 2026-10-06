const attendanceService = require("../services/attendanceService");

const runMutation = (handler, fallback) => async (req, res) => {
  try {
    const result = await handler(req);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    if (statusCode === 500) console.error(fallback, error?.code || error?.message);
    return res.status(statusCode).json({
      success: false,
      code: error?.code || "ATTENDANCE_WRITE_FAILED",
      message: statusCode === 500 ? fallback : error.message,
    });
  }
};

const punchIn = runMutation(
  (req) => attendanceService.punchInEmployee(req.user.companyCode, req.body || {}, req.user),
  "Failed to record punch in."
);
const punchOut = runMutation(
  (req) => attendanceService.punchOutEmployee(req.user.companyCode, req.body || {}, req.user),
  "Failed to record punch out."
);
const saveManualAttendance = runMutation(
  (req) => attendanceService.saveManualAttendance(req.user.companyCode, req.body || {}, req.user),
  "Failed to save attendance."
);
const updateAttendanceCorrection = runMutation(
  (req) => attendanceService.updateAttendanceCorrection(req.user.companyCode, req.body || {}, req.user),
  "Failed to apply attendance correction."
);
const setAttendanceApproval = runMutation(
  (req) => attendanceService.setAttendanceApproval(req.user.companyCode, req.body || {}, req.user),
  "Failed to update attendance approval."
);
const approveAttendanceDay = runMutation(
  async (req) => ({
    message: "Attendance approved successfully.",
    data: await attendanceService.approveAttendanceDay(
      req.user.companyCode,
      req.body?.date,
      req.body?.employeeIds,
      req.user
    ),
  }),
  "Failed to approve attendance."
);
const applyLeaveAttendance = runMutation(
  (req) => attendanceService.applyLeaveAttendance(req.user.companyCode, req.body || {}, req.user),
  "Failed to synchronize approved leave with attendance."
);
const clearLeaveAttendance = runMutation(
  (req) => attendanceService.clearLeaveAttendance(req.user.companyCode, req.body || {}, req.user),
  "Failed to clear leave attendance."
);

const EMPLOYEE_ID_PATTERN = /^[A-Z0-9_-]{1,50}$/;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/*
|--------------------------------------------------------------------------
| Validation Helpers
|--------------------------------------------------------------------------
*/

const validateYear = (year) => {
  const value = Number(year);

  return (
    Number.isInteger(value) &&
    value >= 2000 &&
    value <= 2100
  );
};

const validateMonth = (month) => {
  const value = Number(month);

  return (
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 12
  );
};

const validateDateKey = (date) => {
  const value = String(date ?? "").trim();

  if (!DATE_KEY_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] =
    value.split("-").map(Number);

  const parsed = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

/*
|--------------------------------------------------------------------------
| Authenticated Company Context
|--------------------------------------------------------------------------
|
| companyCode comes ONLY from Firebase authentication.
|
| Never accept companyCode from:
| - req.body
| - req.query
| - req.params
|--------------------------------------------------------------------------
*/

const getCompanyCode = (req) => {
  const companyCode = String(
    req.user?.companyCode ?? ""
  )
    .trim()
    .toUpperCase();

  return companyCode;
};

/*
|--------------------------------------------------------------------------
| GET MONTHLY ATTENDANCE
|--------------------------------------------------------------------------
|
| GET /api/attendance/monthly?year=2026&month=10
|--------------------------------------------------------------------------
*/

const getMonthlyAttendance = async (
  req,
  res
) => {
  const companyCode =
    getCompanyCode(req);

  const year = Number(
    req.query.year
  );

  const month = Number(
    req.query.month
  );

  if (!companyCode) {
    return res.status(403).json({
      success: false,
      code: "INVALID_COMPANY_CONTEXT",
      message:
        "Invalid company context.",
    });
  }

  if (!validateYear(year)) {
    return res.status(400).json({
      success: false,
      field: "year",
      message:
        "A valid year is required.",
    });
  }

  if (!validateMonth(month)) {
    return res.status(400).json({
      success: false,
      field: "month",
      message:
        "Month must be between 1 and 12.",
    });
  }

  try {
    const data =
      await attendanceService.getMonthlyAttendance(
        companyCode,
        year,
        month,
        req.user
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Get monthly attendance error:",
      error
    );

    const statusCode =
      Number.isInteger(
        error?.statusCode
      )
        ? error.statusCode
        : 500;

    return res.status(statusCode).json({
      success: false,
      code:
        error?.code ||
        "ATTENDANCE_FETCH_FAILED",
      message:
        statusCode === 500
          ? "Failed to fetch monthly attendance."
          : error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET DAILY ATTENDANCE
|--------------------------------------------------------------------------
|
| GET /api/attendance/daily?date=2026-10-05
|--------------------------------------------------------------------------
*/

const getDailyAttendance = async (
  req,
  res
) => {
  const companyCode =
    getCompanyCode(req);

  const date = String(
    req.query.date ?? ""
  ).trim();

  if (!companyCode) {
    return res.status(403).json({
      success: false,
      code: "INVALID_COMPANY_CONTEXT",
      message:
        "Invalid company context.",
    });
  }

  if (!validateDateKey(date)) {
    return res.status(400).json({
      success: false,
      field: "date",
      message:
        "Date must be a valid YYYY-MM-DD date.",
    });
  }

  try {
    const data =
      await attendanceService.getDailyAttendance(
        companyCode,
        date,
        req.user
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Get daily attendance error:",
      error
    );

    const statusCode =
      Number.isInteger(
        error?.statusCode
      )
        ? error.statusCode
        : 500;

    return res.status(statusCode).json({
      success: false,
      code:
        error?.code ||
        "ATTENDANCE_FETCH_FAILED",
      message:
        statusCode === 500
          ? "Failed to fetch daily attendance."
          : error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET EMPLOYEE ATTENDANCE
|--------------------------------------------------------------------------
|
| GET /api/attendance/employee/EM001?year=2026&month=10
|--------------------------------------------------------------------------
*/

const getEmployeeAttendance = async (
  req,
  res
) => {
  const companyCode =
    getCompanyCode(req);

  const employeeId = String(
    req.params.employeeId ?? ""
  )
    .trim()
    .toUpperCase();

  const year = Number(
    req.query.year
  );

  const month = Number(
    req.query.month
  );

  if (!companyCode) {
    return res.status(403).json({
      success: false,
      code: "INVALID_COMPANY_CONTEXT",
      message:
        "Invalid company context.",
    });
  }

  if (
    !EMPLOYEE_ID_PATTERN.test(
      employeeId
    )
  ) {
    return res.status(400).json({
      success: false,
      field: "employeeId",
      message:
        "A valid employee ID is required.",
    });
  }

  if (!validateYear(year)) {
    return res.status(400).json({
      success: false,
      field: "year",
      message:
        "A valid year is required.",
    });
  }

  if (!validateMonth(month)) {
    return res.status(400).json({
      success: false,
      field: "month",
      message:
        "Month must be between 1 and 12.",
    });
  }

  try {
    /*
    | IMPORTANT:
    |
    | Parameter order matches the service:
    |
    | companyCode
    | employeeId
    | year
    | month
    | req.user
    */

    const data =
      await attendanceService.getEmployeeAttendance(
        companyCode,
        employeeId,
        year,
        month,
        req.user
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Get employee attendance error:",
      error
    );

    const statusCode =
      Number.isInteger(
        error?.statusCode
      )
        ? error.statusCode
        : error?.code ===
            "EMPLOYEE_NOT_FOUND"
          ? 404
          : 500;

    return res.status(statusCode).json({
      success: false,
      code:
        error?.code ||
        "ATTENDANCE_FETCH_FAILED",
      message:
        statusCode === 500
          ? "Failed to fetch employee attendance."
          : error.message,
    });
  }
};

module.exports = {
  getMonthlyAttendance,
  getDailyAttendance,
  getEmployeeAttendance,
  punchIn,
  punchOut,
  saveManualAttendance,
  updateAttendanceCorrection,
  setAttendanceApproval,
  approveAttendanceDay,
  applyLeaveAttendance,
  clearLeaveAttendance,
};
