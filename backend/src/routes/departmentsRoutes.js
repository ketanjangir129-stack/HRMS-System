const express = require("express");

const {
  getDepartments,
  addDepartment,
  addDesignation,
  editDepartment,
  editDesignation,
  deleteDepartment,
  deleteDesignation,
} = require("../controllers/departmentController.js");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/departmentslist",authenticate, getDepartments);
router.post("/adddepartment",authenticate, addDepartment);
router.post("/:departmentId/adddesignation",authenticate, addDesignation);
router.put("/:departmentId/editdepartment",authenticate, editDepartment);
router.put("/:departmentId/:designationId/editdesignation",authenticate, editDesignation);
router.delete("/:departmentId/deletedepartment",authenticate, deleteDepartment);
router.delete("/:departmentId/:designationId/deletedesignation",authenticate, deleteDesignation);

module.exports = router;