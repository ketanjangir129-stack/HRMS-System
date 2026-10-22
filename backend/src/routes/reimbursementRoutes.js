const express = require("express");

const {
  getClaims,
  getClaimById,
  createClaim,
  approveClaim,
  rejectClaim,
  getSummary,
} = require("../controllers/reimbursementController");

const {
  authenticate,
  requireActiveAccount,
} = require("../middleware/authMiddleware");

const { requirePermission } = require("../middleware/permissionMiddleware");

const router = express.Router();

router.use(authenticate);
router.use(requireActiveAccount);

router.get(
  "/claims",
  requirePermission(["reimbursement.history", "reimbursement.approvals", "reimbursement.apply"]),
  getClaims
);

router.get(
  "/summary",
  requirePermission(["reimbursement.analytics", "reimbursement.history", "reimbursement.approvals"]),
  getSummary
);

router.get(
  "/claims/:claimId",
  requirePermission(["reimbursement.history", "reimbursement.approvals"]),
  getClaimById
);

router.post(
  "/claims",
  requirePermission("reimbursement.apply"),
  createClaim
);

// Finance Manager only — the permission gate stays open for anyone who can
// read claims and the service enforces the Finance Manager designation
// (owner bypasses), because no managed role holds `approvals` by default.
router.patch(
  "/claims/:claimId/approve",
  requirePermission(["reimbursement.history", "reimbursement.approvals"]),
  approveClaim
);

router.patch(
  "/claims/:claimId/reject",
  requirePermission(["reimbursement.history", "reimbursement.approvals"]),
  rejectClaim
);

module.exports = router;
