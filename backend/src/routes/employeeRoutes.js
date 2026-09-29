const express = require("express");

const {
  createEmployee,
  getEmployees,
  getEmployeeDetails,
} = require("../controllers/employeeController");
const { authenticate } = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware");

const router = express.Router();

  // authRoutes jaisa hi: har route ka apna naam, taaki method dekhe bina
  // pata chale kaun sa kya karta hai.
  // Kaun bana sakta hai ye Owner ke Roles & Access se aata hai (employees.add),
  // yahan hardcode nahi hai.
  router.post(
    "/create",
    authenticate,
    requirePermission("employees.add"),
    createEmployee
  );
  router.get("/list",authenticate, getEmployees);
  // Company token se aati hai (req.user), URL se sirf employee ID
  router.get(
    "/details/:employeeId",
    authenticate,
    requirePermission("employees.details"),
    getEmployeeDetails
  );


module.exports = router;