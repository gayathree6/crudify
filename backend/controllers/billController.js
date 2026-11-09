
const mongoose = require("mongoose");
const Bill = require("../models/Bill");
const Product = require("../models/Product");

// Generate a unique bill number
const generateBillNumber = () => {
  return `INV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
};

// CREATE BILL - Staff only
const createBill = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { items, paymentMethod, discount = 0 } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Add at least one product to the bill.",
      });
    }

    if (paymentMethod !== "Cash") {
  return res.status(400).json({
    success: false,
    message: "Online payments must be completed through Razorpay.",
  });
}

    const discountValue = Number(discount);

    if (!Number.isFinite(discountValue) || discountValue < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid discount amount.",
      });
    }

    // Combine duplicate product entries
    const quantities = new Map();

    for (const item of items) {
      if (
        !mongoose.isValidObjectId(item.product) ||
        !Number.isInteger(Number(item.quantity)) ||
        Number(item.quantity) < 1
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid product or quantity.",
        });
      }

      const id = String(item.product);
      quantities.set(
        id,
        (quantities.get(id) || 0) + Number(item.quantity)
      );
    }

    let createdBill;

    await session.withTransaction(async () => {
      const billItems = [];
      let subtotal = 0;

      for (const [productId, quantity] of quantities.entries()) {
        // Atomically reduce stock only when sufficient stock exists
        const product = await Product.findOneAndUpdate(
          {
            _id: productId,
            isActive: true,
            stock: { $gte: quantity },
          },
          {
            $inc: { stock: -quantity },
          },
          {
            new: true,
            session,
          }
        );

        if (!product) {
          const existingProduct = await Product.findById(productId)
            .session(session);

          if (!existingProduct || !existingProduct.isActive) {
            throw new Error("A selected product is unavailable.");
          }

          throw new Error(
            `Insufficient stock for ${existingProduct.name}. Available: ${existingProduct.stock}`
          );
        }

        const price = Number(product.price);
        const total = price * quantity;

        subtotal += total;

        billItems.push({
          product: product._id,
          productName: product.name,
          sku: product.sku,
          quantity,
          price,
          total,
        });
      }

      if (discountValue > subtotal) {
        throw new Error("Discount cannot exceed the bill subtotal.");
      }

      // Tax is zero until GST configuration is implemented
      const taxAmount = 0;
      const grandTotal = subtotal - discountValue + taxAmount;

      const [bill] = await Bill.create(
        [
          {
            billNumber: generateBillNumber(),
            items: billItems,
            subtotal,
            discount: discountValue,
            taxAmount,
            grandTotal,
            paymentMethod,
            paymentStatus: "Paid",
            createdBy: req.user._id,
          },
        ],
        { session }
      );

      createdBill = bill;
    });

    const populatedBill = await Bill.findById(createdBill._id)
      .populate("createdBy", "name email")
      .populate("items.product", "name sku")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Bill created successfully.",
      bill: populatedBill,
    });
  } catch (error) {
    console.error("Create bill error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Unable to create bill.",
    });
  } finally {
    await session.endSession();
  }
};

// GET BILLS
// Admin sees all bills; staff sees only their own bills
const getBills = async (req, res) => {
  try {
    const filter =
      req.user.role === "admin"
        ? {}
        : { createdBy: req.user._id };

    const bills = await Bill.find(filter)
      .populate("createdBy", "name email")
      .populate("items.product", "name sku")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bills.length,
      bills,
    });
  } catch (error) {
    console.error("Get bills error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch bills.",
    });
  }
};

// GET SINGLE BILL
const getBillById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bill ID.",
      });
    }

    const bill = await Bill.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("items.product", "name sku");

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found.",
      });
    }

    if (
      req.user.role !== "admin" &&
      String(bill.createdBy._id) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view this bill.",
      });
    }

    return res.status(200).json({
      success: true,
      bill,
    });
  } catch (error) {
    console.error("Get bill error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch bill.",
    });
  }
};

module.exports = {
  createBill,
  getBills,
  getBillById,
};
