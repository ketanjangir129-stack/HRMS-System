
const express = require("express");

const {
  getHolidays,
  getUpcomingHolidays,
  getHolidayById,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} = require("../controllers/holidayController");

const {
  authenticate,
  requireActiveAccount,
} = require("../middleware/authMiddleware");

const {
  requirePermission,
} = require("../middleware/permissionMiddleware");

const router = express.Router();

router.use(authenticate);
router.use(requireActiveAccount);

// Read holiday records
router.get(
  "/",
  requirePermission("holidays"),
  getHolidays
);

router.get(
  "/upcoming",
  requirePermission("holidays"),
  getUpcomingHolidays
);

router.get(
  "/:date/:holidayId",
  requirePermission("holidays"),
  getHolidayById
);

// Create, update and delete
router.post(
  "/",
  requirePermission("holidays.add"),
  createHoliday
);

router.patch(
  "/:date/:holidayId",
  requirePermission("holidays.edit"),
  updateHoliday
);

router.delete(
  "/:date/:holidayId",
  requirePermission("holidays.delete"),
  deleteHoliday
);

module.exports = router;
