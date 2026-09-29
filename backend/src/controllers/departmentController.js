const departmentService = require("../services/departmentService");

const COMPANY_CODE_PATTERN = /^[A-Z0-9]{3,10}$/;

// GET /api/departments/departmentslist?companyCode=ABC123
const getDepartments = async (req, res) => {
  const { companyCode } = req.query;

  if (!COMPANY_CODE_PATTERN.test(String(companyCode ?? ""))) {
    return res.status(400).json({
      success: false,
      field: "companyCode",
      message: "A valid company code is required.",
    });
  }

  try {
    const departments = await departmentService.getDepartments(
      companyCode
    );

    res.status(200).json({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error("Get departments error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch departments.",
    });
  }
};

//Post /api/departments/adddepartment?companyCode=ABC123
const addDepartment = async (req, res) => {
  const {companyCode, name} = req.body || {};

  if (!COMPANY_CODE_PATTERN.test(String(companyCode ?? ""))) {
    return res.status(400).json({
      success: false,
      field: "companyCode",
      message: "A valid company code is required.",
    });
  }

  const departmentName = String(name ?? "").trim();

  if (!departmentName) {
    return res.status(400).json({
      success: false,
      field: "name",
      message: "Department name is required.",
    });
  }

  try{
    const result = await departmentService.addDepartment(
      companyCode, departmentName
    );

    res.status(201).json({
      success: true,
      message: "Department added successfully.",
      data: result,
    }); 

  }catch (error) {
    console.error("Add department error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add department.",
    });

  }
};


module.exports = {
  getDepartments,
  addDepartment,
};