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
} = require("../controllers/attendanceController");

const {
  authenticate,
  requireActiveAccount,
} = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

// Every attendance endpoint needs a valid token AND an active account, the
// same as leave and holidays: a deactivated employee's token must not keep
// punching in until it expires.
router.use(authenticate);
router.use(requireActiveAccount);

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
| Reads are gated on the attendance page itself. The registry has no
| `attendance.view` section, and which rows a role may see is already
| narrowed by the service (self / managed departments / everyone).
*/

router.get(
  "/monthly",
  requirePermission("attendance"),
  getMonthlyAttendance
);

// Mutations use the permission sections already defined in Roles & Access.
router.post(
  "/punch-in",
  requirePermission("attendance.myAttendance"),
  attendancePhoto,
  punchIn
);

router.post(
  "/punch-out",
  requirePermission("attendance.myAttendance"),
  attendancePhoto,
  punchOut
);

// Replace today's punch-in / punch-out photo (time and location unchanged).
router.post(
  "/photo",
  requirePermission("attendance.myAttendance"),
  attendancePhoto,
  retakePunchPhoto
);


router.post("/manual", requirePermission("attendance.daily"), saveManualAttendance);
router.patch("/correction", requirePermission("attendance.approvals"), updateAttendanceCorrection);
router.patch("/approval/bulk", requirePermission("attendance.approvals"), approveAttendanceDay);
router.patch("/approval", requirePermission("attendance.approvals"), setAttendanceApproval);

// Leave <-> attendance sync is internal to leaveService (approve / delete).
// It is deliberately NOT exposed as a route: a public endpoint let any
// approver book leave days with no leave request and no balance used.

/*
|--------------------------------------------------------------------------
| Daily Attendance
|--------------------------------------------------------------------------
*/

router.get(
  "/daily",
  requirePermission("attendance"),
  getDailyAttendance
);

/*
|--------------------------------------------------------------------------
| Employee Attendance History
|--------------------------------------------------------------------------
*/

router.get(
  "/employee/:employeeId",
  requirePermission("attendance"),
  getEmployeeAttendance
);

module.exports = router;
