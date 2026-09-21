const express = require("express")

const {
  testFirebase,
} = require("../controllers/firebaseController");

const router = express.Router();

router.get("/test", testFirebase);

module.exports = router;