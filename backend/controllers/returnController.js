
const mongoose = require("mongoose");

const Bill = require("../models/Bill");
const Product = require("../models/Product");
const Return = require("../models/Return");
const Notification = require("../models/Notification");
const User = require("../models/User");

const generateReturnNumber = () =>
  `RET-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

// Create persistent notifications safely
const createNotifications = async (notifications) => {
  if (!notifications.length) return;

  try {
    await Notification.insertMany(notifications);
  } catch (error) {
    console.error("Notification creation failed:", error.message);
  }
};

// Find original bill
const getBillForReturn = async (req, res) => {
  try {
    const bill = await Bill.findOne({
      billNumber: req.params.billNumber,
    });

    if (!bill) {
      return res.status(404).json({
        message: "Bill not found.",
      });
    }

    if (bill.paymentStatus === "Cancelled") {
      return res.status(400).json({
        message: "Cancelled bills cannot be returned.",
      });
    }

    const pendingReturns = await Return.find({
      bill: bill._id,
      status: "Pending",
    });

    const pendingQuantities = {};

    pendingReturns.forEach((record) => {
      record.items.forEach((item) => {
        const id = String(item.product);

        pendingQuantities[id] =
          (pendingQuantities[id] || 0) + item.quantity;
      });
    });

    const availableItems = bill.items.map((item) => {
      const productId = String(item.product);
      const alreadyReturned = item.returnedQuantity || 0;
      const pending = pendingQuantities[productId] || 0;

      return {
        product: productId,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        returnedQuantity: alreadyReturned,
        pendingQuantity: pending,
        availableQuantity: Math.max(
          0,
          item.quantity - alreadyReturned - pending
        ),
        price: item.price,
        total: item.total,
      };
    });

    return res.status(200).json({
      bill: {
        _id: bill._id,
        billNumber: bill.billNumber,
        subtotal: bill.subtotal,
        discount: bill.discount,
        grandTotal: bill.grandTotal,
        refundedAmount: bill.refundedAmount || 0,
        paymentMethod: bill.paymentMethod,
        paymentStatus: bill.paymentStatus,
        createdAt: bill.createdAt,
        items: availableItems,
      },
    });
  } catch (error) {
    console.error("Find bill error:", error);

    return res.status(500).json({
      message: "Failed to find bill.",
    });
  }
};

// Staff or Admin submits a return request
const createReturn = async (req, res) => {
  try {
    const { billId, items, reason, refundMethod } = req.body;

    if (!mongoose.Types.ObjectId.isValid(billId)) {
      return res.status(400).json({
        message: "Valid bill ID is required.",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Select at least one product.",
      });
    }

    if (!["Cash", "UPI", "Card"].includes(refundMethod)) {
      return res.status(400).json({
        message: "Invalid refund method.",
      });
    }

    const bill = await Bill.findById(billId);

    if (!bill || bill.paymentStatus === "Cancelled") {
      return res.status(400).json({
        message: "Bill not found or cancelled.",
      });
    }

    if (bill.paymentStatus === "Refunded") {
      return res.status(400).json({
        message: "This bill is already fully refunded.",
      });
    }

    const pendingReturns = await Return.find({
      bill: bill._id,
      status: "Pending",
    });

    const pendingQuantities = {};

    pendingReturns.forEach((record) => {
      record.items.forEach((item) => {
        const id = String(item.product);

        pendingQuantities[id] =
          (pendingQuantities[id] || 0) + item.quantity;
      });
    });

    const requested = new Map();

    for (const item of items) {
      const productId = String(item.product || "");
      const quantity = Number(item.quantity);
      const condition = item.condition || "Resalable";

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          message: "Invalid product.",
        });
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
          message: "Return quantity must be a positive whole number.",
        });
      }

      if (!["Resalable", "Damaged"].includes(condition)) {
        return res.status(400).json({
          message: "Invalid product condition.",
        });
      }

      if (requested.has(productId)) {
        return res.status(400).json({
          message: "Duplicate product entries are not allowed.",
        });
      }

      requested.set(productId, {
        quantity,
        condition,
      });
    }

    const returnItems = [];
    let totalRefund = 0;

    for (const [productId, details] of requested) {
      const billItem = bill.items.find(
        (item) => String(item.product) === productId
      );

      if (!billItem) {
        return res.status(400).json({
          message: "Product does not belong to this bill.",
        });
      }

      const alreadyReturned = billItem.returnedQuantity || 0;
      const pending = pendingQuantities[productId] || 0;

      const available =
        billItem.quantity - alreadyReturned - pending;

      if (details.quantity > available) {
        return res.status(400).json({
          message: `Only ${available} unit(s) of ${billItem.productName} are available for return.`,
        });
      }

      // Allocate original bill discount proportionally
      const discountShare =
        bill.subtotal > 0
          ? (billItem.total / bill.subtotal) *
            (bill.discount || 0)
          : 0;

      const discountedTotal = billItem.total - discountShare;

      const refundPerUnit =
        discountedTotal / billItem.quantity;

      const refundAmount = Number(
        (refundPerUnit * details.quantity).toFixed(2)
      );

      totalRefund += refundAmount;

      returnItems.push({
        product: billItem.product,
        productName: billItem.productName,
        sku: billItem.sku,
        quantity: details.quantity,
        price: billItem.price,
        refundAmount,
        condition: details.condition,
      });
    }

    totalRefund = Number(totalRefund.toFixed(2));

    // Save request as Pending
    const returnRecord = await Return.create({
      returnNumber: generateReturnNumber(),
      bill: bill._id,
      billNumber: bill.billNumber,
      items: returnItems,
      totalRefund,
      reason: reason || "",
      refundMethod,
      status: "Pending",
      requestedBy: req.user._id,
    });

    // Notify all active Admin accounts
    const admins = await User.find({
      role: "admin",
      isActive: true,
    }).select("_id");

    await createNotifications(
      admins.map((admin) => ({
        recipient: admin._id,
        title: "New Return Request",
        message: `Return ${returnRecord.returnNumber} for invoice ${returnRecord.billNumber} requires your approval. Refund: ₹${returnRecord.totalRefund.toFixed(2)}.`,
        type: "Return",
        relatedId: returnRecord._id,
      }))
    );

    return res.status(201).json({
      message: "Return request submitted for Admin approval.",
      return: returnRecord,
    });
  } catch (error) {
    console.error("Create return error:", error);

    return res.status(500).json({
      message: error.message || "Failed to submit return request.",
    });
  }
};

// Admin approves a return request
const approveReturn = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let approvedRecord;

    await session.withTransaction(async () => {
      const record = await Return.findById(
        req.params.id
      ).session(session);

      if (!record) {
        throw new Error("Return request not found.");
      }

      if (record.status !== "Pending") {
        throw new Error("This request has already been reviewed.");
      }

      const bill = await Bill.findById(record.bill).session(session);

      if (!bill) {
        throw new Error("Original bill not found.");
      }

      if (bill.paymentStatus === "Cancelled") {
        throw new Error("Cancelled bills cannot be refunded.");
      }

      for (const returnItem of record.items) {
        const billItem = bill.items.find(
          (item) =>
            String(item.product) === String(returnItem.product)
        );

        if (!billItem) {
          throw new Error(
            "Returned product is missing from original bill."
          );
        }

        const alreadyReturned = billItem.returnedQuantity || 0;

        if (
          alreadyReturned + returnItem.quantity >
          billItem.quantity
        ) {
          throw new Error(
            `Return quantity exceeds purchased quantity for ${billItem.productName}.`
          );
        }

        // Update returned quantity
        billItem.returnedQuantity =
          alreadyReturned + returnItem.quantity;

        // Restock only resalable products
        if (returnItem.condition === "Resalable") {
          const product = await Product.findById(
            returnItem.product
          ).session(session);

          if (product) {
            product.stock += returnItem.quantity;
            await product.save({ session });
          }
        }
      }

      // Update refunded amount
      bill.refundedAmount = Number(
        (
          (bill.refundedAmount || 0) +
          record.totalRefund
        ).toFixed(2)
      );

      // Mark bill refunded only when all quantities are returned
      const allReturned = bill.items.every(
        (item) =>
          (item.returnedQuantity || 0) >= item.quantity
      );

      if (allReturned) {
        bill.paymentStatus = "Refunded";
      }

      await bill.save({ session });

      record.status = "Approved";
      record.reviewedBy = req.user._id;
      record.reviewedAt = new Date();
      record.reviewNote = req.body.reviewNote || "";

      await record.save({ session });

      approvedRecord = record;
    });

    // Notify the staff member after successful approval
    await createNotifications([
      {
        recipient: approvedRecord.requestedBy,
        title: "Return Approved",
        message: `Your return ${approvedRecord.returnNumber} for invoice ${approvedRecord.billNumber} has been approved.`,
        type: "Approval",
        relatedId: approvedRecord._id,
      },
    ]);

    return res.status(200).json({
      message: "Return approved successfully.",
      return: approvedRecord,
    });
  } catch (error) {
    console.error("Approve return error:", error);

    return res.status(400).json({
      message: error.message || "Approval failed.",
    });
  } finally {
    await session.endSession();
  }
};

// Admin rejects a return request
const rejectReturn = async (req, res) => {
  try {
    const { reviewNote } = req.body;

    if (!reviewNote || !reviewNote.trim()) {
      return res.status(400).json({
        message: "Please provide a rejection reason.",
      });
    }

    const record = await Return.findOneAndUpdate(
      {
        _id: req.params.id,
        status: "Pending",
      },
      {
        $set: {
          status: "Rejected",
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
          reviewNote: reviewNote.trim(),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!record) {
      return res.status(404).json({
        message: "Pending return request not found.",
      });
    }

    // Notify the staff member after rejection
    await createNotifications([
      {
        recipient: record.requestedBy,
        title: "Return Rejected",
        message: `Your return ${record.returnNumber} for invoice ${record.billNumber} was rejected. Reason: ${record.reviewNote}`,
        type: "Rejection",
        relatedId: record._id,
      },
    ]);

    return res.status(200).json({
      message: "Return request rejected.",
      return: record,
    });
  } catch (error) {
    console.error("Reject return error:", error);

    return res.status(500).json({
      message: "Failed to reject return.",
    });
  }
};

// Staff sees own requests; Admin sees all
const getReturns = async (req, res) => {
  try {
    const filter =
      req.user.role === "admin"
        ? {}
        : { requestedBy: req.user._id };

    const returns = await Return.find(filter)
      .populate("bill", "billNumber grandTotal")
      .populate("requestedBy", "name email")
      .populate("reviewedBy", "name email")
      .populate("items.product", "name sku")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: returns.length,
      returns,
    });
  } catch (error) {
    console.error("Get returns error:", error);

    return res.status(500).json({
      message: "Failed to fetch returns.",
    });
  }
};

// Get one return request
const getReturnById = async (req, res) => {
  try {
    const record = await Return.findById(req.params.id)
      .populate("bill", "billNumber grandTotal")
      .populate("requestedBy", "name email")
      .populate("reviewedBy", "name email")
      .populate("items.product", "name sku");

    if (!record) {
      return res.status(404).json({
        message: "Return record not found.",
      });
    }

    if (
      req.user.role !== "admin" &&
      String(record.requestedBy._id) !== String(req.user._id)
    ) {
      return res.status(403).json({
        message: "Access denied.",
      });
    }

    return res.status(200).json({
      return: record,
    });
  } catch (error) {
    console.error("Get return error:", error);

    return res.status(500).json({
      message: "Failed to fetch return.",
    });
  }
};

module.exports = {
  getBillForReturn,
  createReturn,
  approveReturn,
  rejectReturn,
  getReturns,
  getReturnById,
};
