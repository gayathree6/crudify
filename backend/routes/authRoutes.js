
const express = require("express");
const router = express.Router();

const {
  login,
  createStaff,
  getProfile,
  updateProfile,
} = require("../controllers/authController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const upload = require("../middleware/uploadMiddleware");

// Public login for Admin and Staff
router.post("/login", login);

// Only Admin can create Staff accounts
router.post("/staff", protect, adminOnly, createStaff);

// Any authenticated user can view their own profile
router.get("/profile", protect, getProfile);

// Any authenticated user can update their own profile
router.put(
  "/profile",
  protect,
  upload.single("image"),
  updateProfile
);

module.exports = router;
