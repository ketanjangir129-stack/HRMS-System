const express = require("express");

const {
  login,getCurrentUser,ownerTokenExchange
} = require("../controllers/authController");
const { changePassword } = require("../controllers/passwordController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

  router.post("/login", login);
  // Owner: Firebase ID token ke badle backend JWT (password yahan nahi aata)
  router.post("/owner-token", ownerTokenExchange);
  // Both stay reachable on the temporary password (no requirePasswordChanged):
  // they are how the user gets off it. New protected routes should use
  // `authenticate, requirePasswordChanged`.
  router.post("/change-password", authenticate, changePassword);
  router.get("/me",authenticate,getCurrentUser);

module.exports = router;