const express = require("express");

const {
  getLeaveRequests,
  createLeaveRequest,
  updateLeaveRequest,
  deleteLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  getLeaveSettings,
  updateLeaveSettings,
  getLeaveUsage,
} = require("../controllers/leaveController");

const {
  authenticate,
  requireActiveAccount,
} = require("../middleware/authMiddleware");

const {
  requirePermission,
} = require("../middleware/permissionMiddleware");

const router = express.Router();

// All leave endpoints require authentication and an active account.
router.use(authenticate);
router.use(requireActiveAccount);

// Leave requests
router.get(
  "/requests",
  requirePermission(["leave.history", "leave.approvals", "leave.apply"]),
  getLeaveRequests
);

router.post(
  "/requests",
  requirePermission("leave.apply"),
  createLeaveRequest
);

router.patch(
  "/requests/:requestId",
  requirePermission(["leave.apply", "leave.approvals"]),
  updateLeaveRequest
);

router.delete(
  "/requests/:requestId",
  requirePermission(["leave.apply", "leave.approvals"]),
  deleteLeaveRequest
);

// Approval workflow
router.patch(
  "/requests/:requestId/approve",
  requirePermission("leave.approvals"),
  approveLeaveRequest
);

router.patch(
  "/requests/:requestId/reject",
  requirePermission("leave.approvals"),
  rejectLeaveRequest
);

// Leave configuration
router.get(
  "/settings",
  requirePermission(["leave", "leave.balance", "leave.apply", "leave.approvals"]),
  getLeaveSettings
);

router.patch(
  "/settings",
  requirePermission("leave"),
  updateLeaveSettings
);

// Leave usage/balance data
router.get(
  "/usage/:year",
  requirePermission(["leave.balance", "leave.apply", "leave.history"]),
  getLeaveUsage
);

router.get(
  "/usage/:year/:employeeId",
  requirePermission(["leave.balance", "leave.approvals"]),
  getLeaveUsage
);

module.exports = router;
