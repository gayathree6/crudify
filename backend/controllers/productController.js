
const Product = require("../models/Product");
const mongoose = require("mongoose");

// CREATE PRODUCT
const createProduct = async (req, res) => {
  try {
    const {
      name, sku, category, price, costPrice, stock,
      lowStockThreshold, barcode, description, unit
    } = req.body;

    if (!name || !sku || !category || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Name, SKU, category and price are required"
      });
    }

    const numericFields = {
      price: Number(price),
      costPrice: Number(costPrice || 0),
      stock: Number(stock || 0),
      lowStockThreshold: Number(lowStockThreshold ?? 5)
    };

    if (Object.values(numericFields).some(
      (value) => !Number.isFinite(value) || value < 0
    )) {
      return res.status(400).json({
        success: false,
        message: "Enter valid non-negative numeric values"
      });
    }

    const product = await Product.create({
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      category: category.trim(),
      ...numericFields,
      barcode: barcode || "",
      description: description || "",
      unit: unit || "piece",
      image: req.file ? `/uploads/${req.file.filename}` : ""
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A product with this SKU already exists"
      });
    }

    console.error("Create product error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create product"
    });
  }
};

// GET ALL PRODUCTS
const getProducts = async (req, res) => {
  try {
    const { search, category, lowStock } = req.query;
    const filter = { isActive: true };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } }
      ];
    }

    if (category) filter.category = category;

    if (lowStock === "true") {
      filter.$expr = { $lte: ["$stock", "$lowStockThreshold"] };
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to fetch products"
    });
  }
};

// GET SINGLE PRODUCT
const getProductById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const product = await Product.findOne({
      _id: req.params.id,
      isActive: true
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to fetch product"
    });
  }
};

// UPDATE PRODUCT
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const allowedFields = [
      "name", "sku", "barcode", "category", "description",
      "price", "costPrice", "stock", "lowStockThreshold", "unit"
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    for (const field of [
      "price", "costPrice", "stock", "lowStockThreshold"
    ]) {
      if (updates[field] !== undefined) {
        const value = Number(updates[field]);

        if (!Number.isFinite(value) || value < 0) {
          return res.status(400).json({
            success: false,
            message: `Invalid ${field} value`
          });
        }

        updates[field] = value;
      }
    }

    if (updates.name) updates.name = updates.name.trim();
    if (updates.category) updates.category = updates.category.trim();
    if (updates.sku) updates.sku = updates.sku.trim().toUpperCase();

    if (req.file) {
      updates.image = `/uploads/${req.file.filename}`;
    }

    const product = await Product.findOneAndUpdate(
      { _id: id, isActive: true },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A product with this SKU already exists"
      });
    }

    res.status(500).json({
      success: false,
      message: "Unable to update product"
    });
  }
};

// SOFT DELETE PRODUCT
const deleteProduct = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to delete product"
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
};
