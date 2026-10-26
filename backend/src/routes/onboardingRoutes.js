const express = require("express");
const upload = require("../middleware/uploadMiddleware");

const {
  getPublicRequest,
  submitPublicForm,
  getRequests,
  getRequestById,
  createSingle,
  createBulk,
  approveSingle,
  approveBatch,
  rejectSingle,
  rejectBatch,
  getHistory,
  stampInvitationEmail,
  stampApprovalEmail,
  getIdentityIndex,
} = require("../controllers/onboardingController");

const {
  authenticate,
  requireActiveAccount,
} = require("../middleware/authMiddleware");

const {
  requirePermission,
} = require("../middleware/permissionMiddleware");

const router = express.Router();

// ==========================================
// Public routes (Candidate self-service)
// ==========================================
router.get("/public/:companyCode/:employeeId", getPublicRequest);
router.post(
  "/public/:companyCode/:employeeId/submit",
  upload.fields([
    { name: "aadhaarCard" },
    { name: "panCard" },
    { name: "resume" },
    { name: "passportPhoto" },
  ]),
  (err, req, res, next) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.code === "LIMIT_FILE_SIZE"
          ? "Each document must be smaller than 5 MB."
          : "Invalid document upload.",
      });
    }
    next();
  },
  submitPublicForm
);

// ==========================================
// Protected routes (HR & Admin)
// ==========================================
router.use(authenticate);
router.use(requireActiveAccount);

// Requests management
router.get("/requests", requirePermission("onboarding.requests"), getRequests);
router.get("/requests/:employeeId", requirePermission("onboarding.requests"), getRequestById);

// Create single and bulk
router.post("/single", requirePermission("onboarding.create"), createSingle);
router.post("/bulk", requirePermission("onboarding.create"), createBulk);
router.get("/identity-index", requirePermission("onboarding.create"), getIdentityIndex);

// Approvals
router.post("/approve", requirePermission("onboarding.requests"), approveSingle);
router.post("/approve-batch", requirePermission("onboarding.requests"), approveBatch);

// Rejections
router.post("/reject", requirePermission("onboarding.requests"), rejectSingle);
router.post("/reject-batch", requirePermission("onboarding.requests"), rejectBatch);

// History
router.get("/history", requirePermission("onboarding.history"), getHistory);

// Email timestamp stamps
router.post("/stamp-invitation-email", requirePermission("onboarding.create"), stampInvitationEmail);
router.post("/stamp-approval-email", requirePermission("onboarding.requests"), stampApprovalEmail);

module.exports = router;
