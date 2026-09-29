const employeeService = require("../services/employeeService");

// Form sirf yahi teen deta hai — "owner" API se kabhi nahi banna chahiye
const ALLOWED_ROLES = ["employee", "manager", "hr"];

// companyCode DB path ka hissa hai, isliye "/" jaisa kuch andar na aaye
const COMPANY_CODE_PATTERN = /^[A-Z0-9]{3,10}$/;

// POST /api/employees  body: { companyCode, employee }
const createEmployee = async (req, res) => {
  const { companyCode, employee } = req.body || {};

  if (!COMPANY_CODE_PATTERN.test(String(companyCode ?? ""))) {
    return res.status(400).json({
      success: false,
      field: "companyCode",
      message: "A valid company code is required.",
    });
  }

  if (!String(employee?.employmentInfo?.employeeId ?? "").trim()) {
    return res.status(400).json({
      success: false,
      field: "employeeId",
      message: "This field is required.",
    });
  }

  if (!ALLOWED_ROLES.includes(employee.account?.role)) {
    return res.status(400).json({
      success: false,
      field: "role",
      message: "Please select a valid role.",
    });
  }

  try {
    const { status, ...result } = await employeeService.createEmployee(
      companyCode,
      employee
    );

    res.status(status).json(result);
  } catch (error) {
    console.error("Create employee error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create employee.",
    });
  }
};

// GET /api/employees?companyCode=ABC123
const getEmployees = async (req, res) => {
  const { companyCode } = req.query;

  if (!COMPANY_CODE_PATTERN.test(String(companyCode ?? ""))) {
    return res.status(400).json({
      success: false,
      field: "companyCode",
      message: "A valid company code is required.",
    });
  }

  try {
    const employees = await employeeService.getEmployees(companyCode);

    res.status(200).json({
      success: true,
      data: employees,
    });
  } catch (error) {
    console.error("Get employees error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch employees.",
    });
  }
};

// Employee ID bhi DB path ka hissa hai — "/", ".", "#", "$", "[", "]" andar na aayein
const EMPLOYEE_ID_PATTERN = /^[A-Z0-9_-]{1,50}$/;

// GET /api/employees/details/:employeeId
// Company sirf token se — query/body se kabhi nahi, taaki doosri company ka
// record na padha ja sake.
const getEmployeeDetails = async (req, res) => {
  const { companyCode } = req.user;
  const employeeId = String(req.params.employeeId ?? "").trim().toUpperCase();

  if (!EMPLOYEE_ID_PATTERN.test(employeeId)) {
    return res.status(400).json({
      success: false,
      field: "employeeId",
      message: "A valid employee ID is required.",
    });
  }

  try {
    const employee = await employeeService.getEmployeeById(
      companyCode,
      employeeId
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        code: "EMPLOYEE_NOT_FOUND",
        message: "Employee not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error("Get employee details error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch employee.",
    });
  }
};

module.exports = {
  createEmployee,
  getEmployees,
  getEmployeeDetails,
};
