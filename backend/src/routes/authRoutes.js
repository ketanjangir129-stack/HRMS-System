const express = require("express");

const {
  login,getCurrentUser
} = require("../controllers/authController");
const { changePassword } = require("../controllers/passwordController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

  router.post("/login", login);
  // Both stay reachable on the temporary password (no requirePasswordChanged):
  // they are how the user gets off it. New protected routes should use
  // `authenticate, requirePasswordChanged`.
  router.post("/change-password", authenticate, changePassword);
  router.get("/me",authenticate,getCurrentUser);

module.exports = router;