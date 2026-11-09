
const mongoose = require("mongoose");
const Purchase = require("../models/Purchase");
const Product = require("../models/Product");
const Supplier = require("../models/Supplier");

// ==========================================
// CREATE PURCHASE AND UPDATE INVENTORY
// ==========================================

const createPurchase = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const {
      supplier,
      paymentStatus,
      notes,
      purchaseDate,
    } = req.body;

    // IMPORTANT: FormData sends items as a JSON string.
    // Support both JSON and ordinary array requests.

    let items;

    try {
      items =
        typeof req.body.items === "string"
          ? JSON.parse(req.body.items)
          : req.body.items;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase items format.",
      });
    }

    // Validate supplier
    if (!mongoose.isValidObjectId(supplier)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid supplier.",
      });
    }

    // Validate purchase items
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Add at least one product.",
      });
    }

    let grandTotal = 0;
    const purchaseItems = [];
    let createdPurchase;

    await session.withTransaction(async () => {
      // Check supplier
      const supplierExists = await Supplier.findById(
        supplier
      ).session(session);

      if (!supplierExists || !supplierExists.isActive) {
        throw new Error("Supplier not found or inactive.");
      }

      // Process every purchase item
      for (const item of items) {
        const quantity = Number(item.quantity);
        const costPrice = Number(item.costPrice);

        if (
          !Number.isInteger(quantity) ||
          quantity <= 0 ||
          !Number.isFinite(costPrice) ||
          costPrice < 0
        ) {
          throw new Error(
            "Enter a valid quantity and purchase price."
          );
        }

        let product;

        // ======================================
        // OPTION 1: EXISTING PRODUCT
        // ======================================

        if (
          item.product &&
          mongoose.isValidObjectId(item.product)
        ) {
          product = await Product.findById(
            item.product
          ).session(session);

          if (!product || !product.isActive) {
            throw new Error(
              "Selected product not found or inactive."
            );
          }

          // Increase existing stock
          product.stock =
            Number(product.stock || 0) + quantity;

          // Update purchase cost
          product.costPrice = costPrice;

          await product.save({ session });
        }

        // ======================================
        // OPTION 2: CREATE NEW PRODUCT
        // ======================================

        else if (item.newProduct) {
          const {
            name,
            sku,
            category,
            price,
            unit,
            lowStockThreshold,
          } = item.newProduct;

          if (
            !name?.trim() ||
            !sku?.trim() ||
            !category?.trim() ||
            price === undefined ||
            price === null ||
            price === ""
          ) {
            throw new Error(
              "New product requires name, SKU, category and selling price."
            );
          }

          const sellingPrice = Number(price);

          if (
            !Number.isFinite(sellingPrice) ||
            sellingPrice < 0
          ) {
            throw new Error(
              "Enter a valid product selling price."
            );
          }

          // Create product with initial purchased stock
          product = new Product({
            name: name.trim(),
            sku: sku.trim().toUpperCase(),
            category: category.trim(),
            price: sellingPrice,
            costPrice,
            stock: quantity,
            unit: unit || "pcs",
            lowStockThreshold:
              lowStockThreshold !== undefined
                ? Number(lowStockThreshold)
                : 5,

            // Save uploaded image
            image: req.file
              ? `/uploads/${req.file.filename}`
              : "",
          });

          await product.save({ session });
        } else {
          throw new Error(
            "Select an existing product or enter new product details."
          );
        }

        // Calculate item total
        const itemTotal = quantity * costPrice;

        purchaseItems.push({
          product: product._id,
          quantity,
          costPrice,
          total: itemTotal,
        });

        grandTotal += itemTotal;
      }

      // ======================================
      // SAVE PURCHASE RECORD
      // ======================================

      const purchases = await Purchase.create(
        [
          {
            supplier,
            items: purchaseItems,
            grandTotal,
            paymentStatus: paymentStatus || "Unpaid",
            notes: notes || "",
            purchaseDate: purchaseDate || Date.now(),
          },
        ],
        { session }
      );

      createdPurchase = purchases[0];
    });

    // ======================================
    // RETURN CREATED PURCHASE
    // ======================================

    const populatedPurchase = await Purchase.findById(
      createdPurchase._id
    )
      .populate("supplier", "name companyName phone")
      .populate("items.product", "name sku image");

    return res.status(201).json({
      success: true,
      message:
        "Purchase recorded and inventory updated successfully.",
      purchase: populatedPurchase,
    });

  } catch (error) {
    console.error("CREATE PURCHASE ERROR:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A product with this SKU already exists.",
      });
    }

    if (
      error.name === "ValidationError" ||
      error.name === "CastError" ||
      error.message.includes("Supplier") ||
      error.message.includes("supplier") ||
      error.message.includes("product") ||
      error.message.includes("Product") ||
      error.message.includes("quantity") ||
      error.message.includes("price") ||
      error.message.includes("SKU")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);

  } finally {
    await session.endSession();
  }
};


// ==========================================
// GET ALL PURCHASES
// ==========================================

const getPurchases = async (req, res, next) => {
  try {
    const purchases = await Purchase.find()
      .populate("supplier", "name companyName phone")
      .populate("items.product", "name sku image")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: purchases.length,
      purchases,
    });

  } catch (error) {
    next(error);
  }
};


// ==========================================
// GET SINGLE PURCHASE
// ==========================================

const getPurchaseById = async (req, res, next) => {
  try {
    const purchase = await Purchase.findById(
      req.params.id
    )
      .populate("supplier", "name companyName phone")
      .populate("items.product", "name sku image");

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found.",
      });
    }

    res.status(200).json({
      success: true,
      purchase,
    });

  } catch (error) {
    next(error);
  }
};


// ==========================================
// UPDATE PURCHASE PAYMENT STATUS
// ==========================================

const updatePurchasePaymentStatus = async (req, res, next) => {
  try {
    const { paymentStatus } = req.body;

    const allowedStatuses = ["Paid", "Unpaid", "Partial"];

    if (!allowedStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status.",
      });
    }

    const purchase = await Purchase.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { new: true, runValidators: true }
    )
      .populate("supplier", "name companyName phone")
      .populate("items.product", "name sku image");

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment status updated successfully.",
      purchase,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
  createPurchase,
  getPurchases,
  getPurchaseById,
  updatePurchasePaymentStatus,
};
