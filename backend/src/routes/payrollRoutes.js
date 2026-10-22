const express = require("express");

const {
  getPayrollRun,
  getMonthlyPayroll,
  getEmployeesWithPayrollStatus,
  getEmployeePayrollMonths,
  getPayrollHistory,
  getPayroll,
  isPayrollMonthLocked,
  generatePayroll,
  approvePayroll,
  lockPayroll,
  markPayrollPaid,
  deletePayroll,
} = require("../controllers/payrollController");

const {
  authenticate,
  requireActiveAccount,
} = require("../middleware/authMiddleware");

const { requirePermission } = require("../middleware/permissionMiddleware");

const router = express.Router();

// All payroll endpoints require authentication and an active account.
router.use(authenticate);
router.use(requireActiveAccount);

// Static reads first — otherwise "runs"/"status"/"employee" would be read
// as a payroll month by the param routes below.
router.get("/runs/:month", requirePermission("payroll"), getPayrollRun);
router.get("/records/:month", requirePermission("payroll"), getMonthlyPayroll);
router.get("/status/:month", requirePermission("payroll"), getEmployeesWithPayrollStatus);
router.get(
  "/employee/:employeeId/months",
  requirePermission(["myPayroll.history", "payroll"]),
  getEmployeePayrollMonths
);
router.get(
  "/employee/:employeeId/history",
  requirePermission(["myPayroll.history", "payroll"]),
  getPayrollHistory
);

// Writes carry the action's own right, matching the dashboard gates.
router.post("/generate", requirePermission("payroll.generate"), generatePayroll);
router.post("/approve", requirePermission("payroll.approve"), approvePayroll);
router.post("/lock", requirePermission("payroll.lock"), lockPayroll);

// "/:month/locked" must come before "/:month/:employeeId",
// otherwise "locked" is read as an employee ID.
router.get("/:month/locked", requirePermission("payroll"), isPayrollMonthLocked);
router.get("/:month/:employeeId", requirePermission("payroll.payslip"), getPayroll);
router.patch("/:month/:employeeId/paid", requirePermission("payroll.generate"), markPayrollPaid);
router.delete("/:month/:employeeId", requirePermission("payroll.generate"), deletePayroll);

module.exports = router;
