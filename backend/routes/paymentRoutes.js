
const express = require("express");
const router = express.Router();

const {
  createOrder,
  verifyPayment,
} = require("../controllers/paymentController");

// Use the same staff authentication middleware
// that protects your existing billing routes.
const { protect, staffOnly } = require("../middleware/authMiddleware");

router.post("/create-order", protect, staffOnly, createOrder);

router.post("/verify", protect, staffOnly, verifyPayment);

module.exports = router;
