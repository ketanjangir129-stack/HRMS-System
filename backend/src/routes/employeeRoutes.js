const express = require("express");

const {
  createEmployee,
  getEmployees,
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
  router.get("/list", getEmployees);


module.exports = router;