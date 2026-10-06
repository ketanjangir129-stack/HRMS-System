const express = require("express");

const {
  getMonthlyAttendance,
  getDailyAttendance,
  getEmployeeAttendance,
  punchIn,
  punchOut,
  saveManualAttendance,
  updateAttendanceCorrection,
  setAttendanceApproval,
  approveAttendanceDay,
  applyLeaveAttendance,
  clearLeaveAttendance,
} = require("../controllers/attendanceController");

const { authenticate } = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware");

const router = express.Router();

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
router.post("/punch-in", authenticate, requirePermission("attendance.myAttendance"), punchIn);
router.post("/punch-out", authenticate, requirePermission("attendance.myAttendance"), punchOut);
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
