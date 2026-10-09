const express = require("express");

const {
  createEmployee,
  getEmployees,
  getEmployeeDetails,
  updateEmployee,
  updateEmployeeStatus,
} = require("../controllers/employeeController");
const { authenticate } = require("../middleware/authMiddleware");
const { requireActiveAccount } = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware");
const upload = require("../middleware/uploadMiddleware");

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
  router.get("/list", authenticate, getEmployees);
  // Company token se aati hai (req.user), URL se sirf employee ID
  router.get(
    "/details/:employeeId",
    authenticate,
    requirePermission("employees.details"),
    getEmployeeDetails
  );
  router.patch(
    "/update/:employeeId",
    authenticate,
    requirePermission("employees.details"),
    upload.single("resume"),   //multer
    (err, req, res, next) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.code === "LIMIT_FILE_SIZE" ? "Resume must be smaller than 5 MB." : "Invalid resume upload.",
        });
      }
      next();
    },
    updateEmployee
  );

  // Activate / Deactivate — body: { status: "Active" | "Inactive" }
  router.patch(
    "/status/:employeeId",
    authenticate,
    requireActiveAccount,
    requirePermission("employees.details"),
    updateEmployeeStatus
  );


module.exports = router;