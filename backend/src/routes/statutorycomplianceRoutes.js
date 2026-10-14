const express = require("express");

const {
  getPolicy,
  updatePolicy,
  calculate,
} = require("../controllers/statutorycompliance.Controller");

const {
  authenticate,
  requireActiveAccount,
} = require("../middleware/authMiddleware");

const { requirePermission } = require("../middleware/permissionMiddleware");

const router = express.Router();

// All statutory compliance endpoints require authentication and an active account.
router.use(authenticate);
router.use(requireActiveAccount);

// Full policy — any of the policy panels may read it.
router.get(
  "/",
  requirePermission([
    "statutoryCompliance",
    "statutoryCompliance.pf",
    "statutoryCompliance.esi",
    "statutoryCompliance.professionalTax",
    "statutoryCompliance.incomeTax",
  ]),
  getPolicy
);

// One policy at a time — saving needs the update right.
router.put(
  "/:key",
  requirePermission("statutoryCompliance.update"),
  updatePolicy
);

// Price earnings against the stored (or supplied) policy.
router.post(
  "/calculate",
  requirePermission([
    "statutoryCompliance",
    "salary.create",
    "salary.update",
    "salary",
    "payroll",
  ]),
  calculate
);

module.exports = router;
