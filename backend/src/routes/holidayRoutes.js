
const express = require("express");

const {
  getHolidays,
  getUpcomingHolidays,
  getHolidayById,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  importHolidays,
  uploadHolidayImage,
  removeHolidayImage,
} = require("../controllers/holidayController");

const upload = require("../middleware/uploadMiddleware");

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

// Bulk import from a parsed Excel / CSV / PDF file
router.post(
  "/import",
  requirePermission("holidays.add"),
  importHolidays
);

// Banner image shown on the upcoming holidays panels
router.put(
  "/:date/:holidayId/image",
  requirePermission("holidays.edit"),
  upload.single("image"),
  (err, req, res, next) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.code === "LIMIT_FILE_SIZE" ? "Image must be smaller than 5 MB." : "Invalid image upload.",
      });
    }
    next();
  },
  uploadHolidayImage
);

router.delete(
  "/:date/:holidayId/image",
  requirePermission("holidays.edit"),
  removeHolidayImage
);

module.exports = router;
