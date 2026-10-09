const express = require("express");

const {
  getMonthlyAttendance,
  getDailyAttendance,
  getEmployeeAttendance,
  punchIn,
  punchOut,
  retakePunchPhoto,
  saveManualAttendance,
  updateAttendanceCorrection,
  setAttendanceApproval,
  approveAttendanceDay,
  applyLeaveAttendance,
  clearLeaveAttendance,
} = require("../controllers/attendanceController");

const { authenticate } = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

/*
 * Multer errors (e.g. file too large) otherwise fall through to Express's
 * HTML error page, which the client cannot parse as JSON.
 */
const attendancePhoto = (req, res, next) =>
  upload.single("image")(req, res, (error) => {
    if (!error) return next();

    const tooLarge = error.code === "LIMIT_FILE_SIZE";

    return res.status(tooLarge ? 413 : 400).json({
      success: false,
      code: tooLarge ? "ATTENDANCE_IMAGE_TOO_LARGE" : "INVALID_ATTENDANCE_IMAGE",
      message: tooLarge
        ? "Attendance photo must not exceed 5 MB."
        : "Invalid attendance photo upload.",
    });
  });

/*
|--------------------------------------------------------------------------
| Monthly Attendance
|--------------------------------------------------------------------------
*/

router.get(
  "/monthly",
  authenticate,
  requirePermission("attendance.view"),
  getMonthlyAttendance
);

// Mutations use the permission sections already defined in Roles & Access.
router.post(
  "/punch-in",
  authenticate,
  requirePermission("attendance.myAttendance"),
  attendancePhoto,
  punchIn
);

router.post(
  "/punch-out",
  authenticate,
  requirePermission("attendance.myAttendance"),
  attendancePhoto,
  punchOut
);

// Replace today's punch-in / punch-out photo (time and location unchanged).
router.post(
  "/photo",
  authenticate,
  requirePermission("attendance.myAttendance"),
  attendancePhoto,
  retakePunchPhoto
);


router.post("/manual", authenticate, requirePermission("attendance.daily"), saveManualAttendance);
router.patch("/correction", authenticate, requirePermission("attendance.approvals"), updateAttendanceCorrection);
router.patch("/approval/bulk", authenticate, requirePermission("attendance.approvals"), approveAttendanceDay);
router.patch("/approval", authenticate, requirePermission("attendance.approvals"), setAttendanceApproval);
router.post("/leave/sync", authenticate, requirePermission("attendance.approvals"), applyLeaveAttendance);
router.delete("/leave/sync", authenticate, requirePermission("attendance.approvals"), clearLeaveAttendance);

/*
|--------------------------------------------------------------------------
| Daily Attendance
|--------------------------------------------------------------------------
*/

router.get(
  "/daily",
  authenticate,
  requirePermission("attendance.view"),
  getDailyAttendance
);

/*
|--------------------------------------------------------------------------
| Employee Attendance History
|--------------------------------------------------------------------------
*/

router.get(
  "/employee/:employeeId",
  authenticate,
  requirePermission("attendance.view"),
  getEmployeeAttendance
);

module.exports = router;
