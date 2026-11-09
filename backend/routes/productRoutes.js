
const express = require("express");
const router = express.Router();

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const upload = require("../middleware/uploadMiddleware");

// All routes require login
router.use(protect);

// Both Admin and Staff can view products
router.get("/", getProducts);
router.get("/:id", getProductById);

// Only Admin can manage products
router.post("/", adminOnly, upload.single("image"), createProduct);
router.put("/:id", adminOnly, upload.single("image"), updateProduct);
router.delete("/:id", adminOnly, deleteProduct);

module.exports = router;
