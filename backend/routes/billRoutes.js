
const express = require("express");
const router = express.Router();

const {
  createBill,
  getBills,
  getBillById,
} = require("../controllers/billController");

const {
  protect,
  staffOnly,
} = require("../middleware/authMiddleware");

// All logged-in users can view bills according to their role
router.use(protect);

// Only staff can create customer bills
router.post("/", staffOnly, createBill);

// Admin sees all bills; staff sees their own bills
router.get("/", getBills);

// Admin can view any bill; staff can view only their own
router.get("/:id", getBillById);

module.exports = router;
