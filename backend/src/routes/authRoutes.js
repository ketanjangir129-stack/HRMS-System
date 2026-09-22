const express = require("express");

const {
  login,getCurrentUser
} = require("../controllers/authController");
const { changePassword } = require("../controllers/passwordController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

  router.post("/login", login);
  router.post("/change-password", changePassword);
  router.get("/me",authenticate,getCurrentUser);

module.exports = router;