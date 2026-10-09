const express = require("express");
const { authenticate } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { uploadSingleFile } = require("../controllers/uploadController");

const router = express.Router();

// POST /api/upload/file  field name: "file", body: folder, resourceType?
router.post("/file", authenticate, upload.single("file"), uploadSingleFile);

module.exports = router;
