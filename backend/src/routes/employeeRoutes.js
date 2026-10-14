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
const { isOwnerRole } = require("../utils/permissions");
const upload = require("../middleware/uploadMiddleware");

// Profile page har role khol sakta hai (bina employees.details ke), isliye
// apni photo ka save yahin allow hota hai — sirf self + sirf photo key.
// Baaki sab pehle jaisa employees.details maangta hai.
const allowSelfPhotoOrRequireDetails = async (req, res, next) => {
  try {
    const { role, employeeId: actorId } = req.user || {};
    const targetId = String(req.params.employeeId ?? "").trim().toUpperCase();
    const actor = String(actorId ?? "").trim().toUpperCase();

    if (isOwnerRole(role)) return next();

    if (actor && targetId && actor === targetId) {
      let section = req.body?.section;
      let data = req.body?.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch { data = null; }
      }
      if (
        section === "personalInfo" &&
        data && typeof data === "object" && !Array.isArray(data) &&
        Object.keys(data).length > 0 &&
        Object.keys(data).every((k) => k === "photo")
      ) {
        return next();
      }
    }

    return requirePermission("employees.details")(req, res, next);
  } catch (error) {
    console.error("Self photo permission check error:", error);
    return res.status(500).json({ success: false, message: "Unable to verify permissions." });
  }
};

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
    allowSelfPhotoOrRequireDetails,
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