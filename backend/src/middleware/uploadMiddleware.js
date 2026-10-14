const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(), //file RAM mein req.file.buffer format mein save
  limits: {
    fileSize: 5 * 1024 * 1024,  //multer file size karta hai then cloudinary ko file send hogi
  },
});

module.exports = upload;