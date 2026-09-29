const express = require("express");

const {
  getDepartments,
  addDepartment,
} = require("../controllers/departmentController.js");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/departmentslist",authenticate, getDepartments);
router.post("/adddepartment",authenticate, addDepartment);

module.exports = router;