
const express = require("express");
const router = express.Router();

const {
  createPurchase,
  getPurchases,
  getPurchaseById,
  updatePurchasePaymentStatus,
} = require("../controllers/purchaseController");

const { protect, adminOnly } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.use(protect, adminOnly);

router.post("/", upload.single("image"), createPurchase);
router.get("/", getPurchases);
router.get("/:id", getPurchaseById);

// Update purchase payment status
router.patch("/:id/payment", updatePurchasePaymentStatus);

module.exports = router;
