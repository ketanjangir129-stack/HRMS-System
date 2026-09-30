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
    if (error.code === "DEPARTMENT_EXISTS") {
      return res.status(409).json({
        success: false,
        field: "name",
        message: "A department with this name already exists.",
      });
    }

    console.error("Add department error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add department.",
    });

  }
};

//Post /api/departments/adddesignation?companyCode=ABC123&departmentId=XYZ456
const addDesignation = async (req, res) => {
  const { companyCode, name } = req.body || {};
  const { departmentId } = req.params;

  // Validate company code
  if (!COMPANY_CODE_PATTERN.test(String(companyCode ?? ""))) {
    return res.status(400).json({
      success: false,
      field: "companyCode",
      message: "A valid company code is required.",
    });
  }

  // Validate department ID
  if (!String(departmentId ?? "").trim()) {
    return res.status(400).json({
      success: false,

      field: "departmentId",
      message: "Department ID is required.",
    });
  }

  // Validate designation name
  const designationName = String(name ?? "").trim();

  if (!designationName) {
    return res.status(400).json({
      success: false,
      field: "name",
      message: "Designation name is required.",
    });
  }

  try {
    const result = await departmentService.addDesignation(
      companyCode,
      departmentId,
      designationName
    );

    return res.status(201).json({
      success: true,
      message: "Designation added successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Add designation error:", error);

    if (error.code === "DEPARTMENT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === "DESIGNATION_EXISTS") {
      return res.status(409).json({
        success: false,
        field: "name",
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to add designation.",
    });
  }
};


//Put /api/departments/:departmentId/editdepartment
const editDepartment = async (req, res) => {
  const { companyCode, name } = req.body || {};
  const { departmentId } = req.params;

  // Validate company code
  if (!COMPANY_CODE_PATTERN.test(String(companyCode ?? ""))) {
    return res.status(400).json({
      success: false,
      field: "companyCode",
      message: "A valid company code is required.",
    });
  }

  // Validate department ID
  if (!String(departmentId ?? "").trim()) {
    return res.status(400).json({
      success: false,
      field: "departmentId",
      message: "Department ID is required.",
    });
  }

  // Validate department name
  const departmentName = String(name ?? "").trim();

  if (!departmentName) {
    return res.status(400).json({
      success: false,
      field: "name",
      message: "Department name is required.",
    });
  }

  try {
    const result = await departmentService.editDepartment(
      companyCode,
      departmentId,
      departmentName
    );

    return res.status(200).json({
      success: true,
      message: "Department updated successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Edit department error:", error);

    if (error.code === "DEPARTMENT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === "DEPARTMENT_EXISTS") {
      return res.status(409).json({
        success: false,
        field: "name",
        message: "A department with this name already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update department.",
    });
  }
};


//Put /api/departments/:departmentId/:designationId/editdesignation
const editDesignation = async (req, res) => {
  const { companyCode, name } = req.body || {};
  const { departmentId, designationId } = req.params;

  // Validate company code
  if (!COMPANY_CODE_PATTERN.test(String(companyCode ?? ""))) {
    return res.status(400).json({
      success: false,
      field: "companyCode",
      message: "A valid company code is required.",
    });
  }

  // Validate department ID
  if (!String(departmentId ?? "").trim()) {
    return res.status(400).json({
      success: false,
      field: "departmentId",
      message: "Department ID is required.",
    });
  }

  // Validate designation ID
  if (!String(designationId ?? "").trim()) {
    return res.status(400).json({
      success: false,
      field: "designationId",
      message: "Designation ID is required.",
    });
  }

  // Validate designation name
  const designationName = String(name ?? "").trim();

  if (!designationName) {
    return res.status(400).json({
      success: false,
      field: "name",
      message: "Designation name is required.",
    });
  }

  try {
    const result = await departmentService.editDesignation(
      companyCode,
      departmentId,
      designationId,
      designationName
    );

    return res.status(200).json({
      success: true,
      message: "Designation updated successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Edit designation error:", error);

    if (error.code === "DESIGNATION_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === "DESIGNATION_EXISTS") {
      return res.status(409).json({
        success: false,
        field: "name",
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update designation.",
    });
  }
};


//Delete /api/departments/:departmentId/deletedepartment?companyCode=ABC123
const deleteDepartment = async (req, res) => {
  const { companyCode } = req.query;
  const { departmentId } = req.params;

  // Validate company code
  if (!COMPANY_CODE_PATTERN.test(String(companyCode ?? ""))) {
    return res.status(400).json({
      success: false,
      field: "companyCode",
      message: "A valid company code is required.",
    });
  }

  // Validate department ID
  if (!String(departmentId ?? "").trim()) {
    return res.status(400).json({
      success: false,
      field: "departmentId",
      message: "Department ID is required.",
    });
  }

  try {
    const result = await departmentService.deleteDepartment(
      companyCode,
      departmentId
    );

    return res.status(200).json({
      success: true,
      message: "Department deleted successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Delete department error:", error);

    if (error.code === "DEPARTMENT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === "DEPARTMENT_IN_USE") {
      return res.status(409).json({
        success: false,
        assignedCount: error.assignedCount,
        message:
          "This department still has employees assigned. Move them to another department first.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete department.",
    });
  }
};


//Delete /api/departments/:departmentId/:designationId/deletedesignation?companyCode=ABC123
const deleteDesignation = async (req, res) => {
  const { companyCode } = req.query;
  const { departmentId, designationId } = req.params;

  // Validate company code
  if (!COMPANY_CODE_PATTERN.test(String(companyCode ?? ""))) {
    return res.status(400).json({
      success: false,
      field: "companyCode",
      message: "A valid company code is required.",
    });
  }

  // Validate department ID
  if (!String(departmentId ?? "").trim()) {
    return res.status(400).json({
      success: false,
      field: "departmentId",
      message: "Department ID is required.",
    });
  }

  // Validate designation ID
  if (!String(designationId ?? "").trim()) {
    return res.status(400).json({
      success: false,
      field: "designationId",
      message: "Designation ID is required.",
    });
  }

  try {
    const result = await departmentService.deleteDesignation(
      companyCode,
      departmentId,
      designationId
    );

    return res.status(200).json({
      success: true,
      message: "Designation deleted successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Delete designation error:", error);

    if (error.code === "DESIGNATION_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === "DESIGNATION_IN_USE") {
      return res.status(409).json({
        success: false,
        assignedCount: error.assignedCount,
        message:
          "This designation still has employees assigned. Move them to another designation first.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete designation.",
    });
  }
};


module.exports = {
  getDepartments,
  addDepartment,
  addDesignation,
  editDepartment,
  editDesignation,
  deleteDepartment,
  deleteDesignation,
};