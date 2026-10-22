const salaryService = require("../services/salaryService");
const roleAccessService = require("../services/roleAccessService");
const { hasPermission, isOwnerRole } = require("../utils/permissions");

const handleError = (res, error, fallbackMessage) => {
  console.error("Salary controller error:", error);

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

// POST /api/salary/create
const createSalary = async (req, res) => {
  try {
    const result = await salaryService.createSalary(
      req.user.companyCode,
      req.body,
      { updatedBy: req.body?.updatedBy || null }
    );

    return res.status(201).json({
      success: true,
      message: "Salary assigned successfully.",
      data: result,
    });
  } catch (error) {
    return handleError(res, error, "Failed to assign salary.");
  }
};

// GET /api/salary/:employeeId
const getSalaryById = async (req, res) => {
  try {
    const result = await salaryService.getSalaryById(
      req.user.companyCode,
      req.params.employeeId
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch salary.");
  }
};

// GET /api/salary/list
const getAllSalaries = async (req, res) => {
  try {
    const result = await salaryService.getAllSalaries(req.user.companyCode);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch salaries.");
  }
};

// PATCH /api/salary/:employeeId
const updateSalary = async (req, res) => {
  try {
    const result = await salaryService.updateSalary(
      req.user.companyCode,
      req.params.employeeId,
      req.body,
      { updatedBy: req.body?.updatedBy || null }
    );

    return res.status(200).json({
      success: true,
      message: "Salary updated successfully.",
      data: result,
    });
  } catch (error) {
    return handleError(res, error, "Failed to update salary.");
  }
};

// POST /api/salary/import
const importSalaries = async (req, res) => {
  try {
    const { rows, updateExisting = false, updatedBy = null } = req.body || {};

    // Importing always assigns new structures, so salary.create is required.
    // Revising existing ones through the same run additionally needs
    // salary.update — same rights the import screen gates on.
    if (updateExisting && !isOwnerRole(req.user?.role)) {
      const stored = await roleAccessService.getRoleAccessForRole(
        req.user.companyCode,
        req.user.role
      );

      if (!hasPermission(stored, req.user.role, "salary.update")) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to perform this action.",
        });
      }
    }

    const result = await salaryService.importSalaries(
      req.user.companyCode,
      rows,
      { updateExisting: Boolean(updateExisting), updatedBy }
    );

    return res.status(200).json({
      success: true,
      message: `Imported ${result.summary.created + result.summary.updated} salary structures.`,
      data: result,
    });
  } catch (error) {
    return handleError(res, error, "Failed to import salaries.");
  }
};

// GET /api/salary/export?employeeIds=EMP001,EMP002
const exportSalaries = async (req, res) => {
  try {
    const raw = req.query?.employeeIds;

    const employeeIds =
      raw === undefined || raw === null || raw === ""
        ? null
        : String(raw)
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean);

    const result = await salaryService.exportSalaries(
      req.user.companyCode,
      employeeIds
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleError(res, error, "Failed to export salaries.");
  }
};

// GET /api/salary/revisions
const getSalaryRevisions = async (req, res) => {
  try {
    const result = await salaryService.getSalaryRevisions(req.user.companyCode);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch salary revisions.");
  }
};

// GET /api/salary/revisions/:employeeId
const getSalaryRevisionById = async (req, res) => {
  try {
    const result = await salaryService.getSalaryRevisionById(
      req.user.companyCode,
      req.params.employeeId
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch salary revisions.");
  }
};

module.exports = {
  createSalary,
  getSalaryById,
  getAllSalaries,
  updateSalary,
  importSalaries,
  exportSalaries,
  getSalaryRevisions,
  getSalaryRevisionById,
};
