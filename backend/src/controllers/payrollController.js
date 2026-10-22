const db = require("../config/firebase");
const payrollService = require("../services/payrollService");
const roleAccessService = require("../services/roleAccessService");
const { hasPermission, isOwnerRole } = require("../utils/permissions");

const handleError = (res, error, fallbackMessage) => {
  console.error("Payroll controller error:", error);

  if (error.code === "VALIDATION_FAILED") {
    return res.status(422).json({
      success: false,
      code: error.code,
      message: error.message,
      errors: error.errors || {},
    });
  }

  const status = Number(error.statusCode) || 500;

  return res.status(status).json({
    success: false,
    code: error.code || (status < 500 ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR"),
    message:
      status < 500 ? error.message : fallbackMessage || "An unexpected error occurred.",
  });
};

/* Who did it, in the one shape every stamp on a run uses. The token carries
| the id and role but no name, so the name is read once per write. */
const buildActor = async (companyCode, user) => {
  const employeeId = user?.employeeId || user?.uid || "unknown";
  const role = user?.role || "unknown";

  if (isOwnerRole(role)) {
    const details = await db
      .ref(`companies/${companyCode}/details/ownerName`)
      .once("value")
      .then((snapshot) => snapshot.val())
      .catch(() => null);

    return { employeeId, name: details || "Owner", role };
  }

  const name = await db
    .ref(`companies/${companyCode}/employees/${String(employeeId).toUpperCase()}/personalInfo/name`)
    .once("value")
    .then((snapshot) => snapshot.val())
    .catch(() => null);

  return { employeeId, name: name || "Unknown", role };
};

/*
| Self reads (my-payroll) vs operator reads (dashboard) share these endpoints.
| Anyone holding `payroll` may read any employee; everyone else may read only
| themselves through `myPayroll.history`.
*/
const assertPayrollScope = async (companyCode, user, employeeId) => {
  if (isOwnerRole(user?.role)) return;

  const stored = await roleAccessService.getRoleAccessForRole(companyCode, user.role);

  if (hasPermission(stored, user.role, "payroll")) return;

  if (
    hasPermission(stored, user.role, "myPayroll.history") &&
    String(user?.employeeId || "").toUpperCase() === String(employeeId || "").toUpperCase()
  ) {
    return;
  }

  const error = new Error("You do not have permission to perform this action.");
  error.statusCode = 403;
  throw error;
};

// GET /api/payroll/runs/:month
const getPayrollRun = async (req, res) => {
  try {
    const result = await payrollService.getPayrollRun(
      req.user.companyCode,
      req.params.month
    );

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return handleError(res, error, "Failed to fetch payroll run.");
  }
};

// GET /api/payroll/records/:month
const getMonthlyPayroll = async (req, res) => {
  try {
    const result = await payrollService.getMonthlyPayroll(
      req.user.companyCode,
      req.params.month
    );

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return handleError(res, error, "Failed to fetch payroll records.");
  }
};

// GET /api/payroll/status/:month
const getEmployeesWithPayrollStatus = async (req, res) => {
  try {
    const result = await payrollService.getEmployeesWithPayrollStatus(
      req.user.companyCode,
      req.params.month
    );

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return handleError(res, error, "Failed to fetch payroll status.");
  }
};

// GET /api/payroll/employee/:employeeId/months?months=YYYY-MM,...
const getEmployeePayrollMonths = async (req, res) => {
  try {
    await assertPayrollScope(req.user.companyCode, req.user, req.params.employeeId);

    const months = String(req.query.months || "")
      .split(",")
      .map((month) => month.trim())
      .filter(Boolean);

    const result = await payrollService.getEmployeePayrollMonths(
      req.user.companyCode,
      req.params.employeeId,
      months
    );

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return handleError(res, error, "Failed to fetch employee payroll.");
  }
};

// GET /api/payroll/employee/:employeeId/history?anchorMonth=YYYY-MM&count=3
const getPayrollHistory = async (req, res) => {
  try {
    await assertPayrollScope(req.user.companyCode, req.user, req.params.employeeId);

    const result = await payrollService.getPayrollHistory(
      req.user.companyCode,
      req.params.employeeId,
      req.query.anchorMonth,
      req.query.count === undefined ? undefined : Number(req.query.count)
    );

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return handleError(res, error, "Failed to fetch payroll history.");
  }
};

// GET /api/payroll/:month/:employeeId
const getPayroll = async (req, res) => {
  try {
    const result = await payrollService.getPayroll(
      req.user.companyCode,
      req.params.month,
      req.params.employeeId
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        code: "PAYROLL_NOT_FOUND",
        message: "No payroll found for this employee in this month.",
      });
    }

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return handleError(res, error, "Failed to fetch payroll.");
  }
};

// GET /api/payroll/:month/locked
const isPayrollMonthLocked = async (req, res) => {
  try {
    const locked = await payrollService.isPayrollMonthLocked(
      req.user.companyCode,
      req.params.month
    );

    return res.status(200).json({ success: true, data: { locked } });
  } catch (error) {
    return handleError(res, error, "Failed to check payroll lock.");
  }
};

// POST /api/payroll/generate
const generatePayroll = async (req, res) => {
  try {
    const { payrollMonth, employeeIds = null, regenerate = false } = req.body || {};
    const actor = await buildActor(req.user.companyCode, req.user);

    const result = await payrollService.generatePayroll(
      req.user.companyCode,
      payrollMonth,
      { employeeIds, regenerate: Boolean(regenerate), generatedBy: actor }
    );

    const generatedCount = result.generated.length;
    const skippedCount = result.skipped.length;

    return res.status(200).json({
      success: generatedCount > 0,
      message:
        generatedCount === 0
          ? "Nothing to generate. Every employee was skipped."
          : `Payroll generated for ${generatedCount} employee${generatedCount === 1 ? "" : "s"}${skippedCount > 0 ? `, ${skippedCount} skipped` : ""}.`,
      data: result,
    });
  } catch (error) {
    return handleError(res, error, "Failed to generate payroll.");
  }
};

// POST /api/payroll/approve
const approvePayroll = async (req, res) => {
  try {
    const actor = await buildActor(req.user.companyCode, req.user);

    const run = await payrollService.approvePayroll(
      req.user.companyCode,
      req.body?.payrollMonth,
      actor
    );

    return res.status(200).json({
      success: true,
      message: "Payroll approved. It is now closed to changes.",
      data: { run },
    });
  } catch (error) {
    return handleError(res, error, "Failed to approve payroll.");
  }
};

// POST /api/payroll/lock
const lockPayroll = async (req, res) => {
  try {
    const actor = await buildActor(req.user.companyCode, req.user);

    const run = await payrollService.lockPayroll(
      req.user.companyCode,
      req.body?.payrollMonth,
      actor
    );

    return res.status(200).json({
      success: true,
      message: "Payroll locked. This month is now final.",
      data: { run },
    });
  } catch (error) {
    return handleError(res, error, "Failed to lock payroll.");
  }
};

// PATCH /api/payroll/:month/:employeeId/paid
const markPayrollPaid = async (req, res) => {
  try {
    const result = await payrollService.markPayrollPaid(
      req.user.companyCode,
      req.params.month,
      req.params.employeeId
    );

    return res.status(200).json({
      success: true,
      message: "Marked as paid.",
      data: result,
    });
  } catch (error) {
    return handleError(res, error, "Failed to mark payroll as paid.");
  }
};

// DELETE /api/payroll/:month/:employeeId
const deletePayroll = async (req, res) => {
  try {
    const result = await payrollService.deletePayroll(
      req.user.companyCode,
      req.params.month,
      req.params.employeeId
    );

    return res.status(200).json({
      success: true,
      message: "Payroll deleted.",
      data: result,
    });
  } catch (error) {
    return handleError(res, error, "Failed to delete payroll.");
  }
};

module.exports = {
  getPayrollRun,
  getMonthlyPayroll,
  getEmployeesWithPayrollStatus,
  getEmployeePayrollMonths,
  getPayrollHistory,
  getPayroll,
  isPayrollMonthLocked,
  generatePayroll,
  approvePayroll,
  lockPayroll,
  markPayrollPaid,
  deletePayroll,
};
