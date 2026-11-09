
const express = require("express");
const router = express.Router();

const {
  getAllStaff,
  updateStaff,
  toggleStaffStatus,
  deleteStaff
} = require("../controllers/staffController");

const {
  protect,
  adminOnly
} = require("../middleware/authMiddleware");

// All staff management routes require Admin access
router.use(protect, adminOnly);

router.get("/", getAllStaff);
router.put("/:id", updateStaff);
router.patch("/:id/status", toggleStaffStatus);
router.delete("/:id", deleteStaff);

module.exports = router;
