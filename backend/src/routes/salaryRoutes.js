const express = require("express");

const { createSalary, getSalaryById, getAllSalaries, updateSalary, importSalaries, exportSalaries, getSalaryRevisions, getSalaryRevisionById } = require("../controllers/salaryController");

const {
  authenticate,
  requireActiveAccount,
} = require("../middleware/authMiddleware");

const { requirePermission } = require("../middleware/permissionMiddleware");

const router = express.Router();

// All salary endpoints require authentication and an active account.
router.use(authenticate);
router.use(requireActiveAccount);

// Assign a new salary structure.

// router.post("/create", requirePermission("salary.create"), createSalary);
router.post("/create", createSalary);

// Get all salaries for the company — must come before /:employeeId,
// otherwise "list" is treated as an employee ID.
router.get("/list", requirePermission("salary"), getAllSalaries);
// router.get("/list",getAllSalaries);

// Export salary records — static paths must come before /:employeeId,
// otherwise "export" is treated as an employee ID.
router.get("/export", requirePermission("salary"), exportSalaries);

// Salary revisions — static paths must come before /:employeeId,
// otherwise "revisions" is treated as an employee ID.
router.get("/revisions", requirePermission("salary"), getSalaryRevisions);
router.get("/revisions/:employeeId", requirePermission("salary"), getSalaryRevisionById);

// Get salary by employee ID
// router.get("/:employeeId", requirePermission("salary"), getSalaryById);
router.get("/:employeeId", getSalaryById);

// Revise an existing salary structure — archives the current one to history.
router.patch("/:employeeId", requirePermission("salary.update"), updateSalary);

// Bulk import — rows are pre-parsed by the caller (Excel/CSV/etc. all arrive
// as the same row shape). Must come before /:employeeId is irrelevant here
// (different method), but keeping write routes grouped.
router.post("/import", requirePermission("salary.create"), importSalaries);

module.exports = router;
