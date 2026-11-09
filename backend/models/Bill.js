
const mongoose = require("mongoose");

const billItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  sku: {
    type: String,
    default: "",
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  returnedQuantity: {
    type: Number,
    default: 0,
    min: 0,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  total: {
    type: Number,
    required: true,
    min: 0,
  },
});

const billSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      required: true,
      unique: true,
    },
    items: {
      type: [billItemSchema],
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
    },
    refundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Cash, UPI, Card, or Razorpay
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Card", "Razorpay"],
      required: true,
    },

    // When Razorpay is used, store whether the customer
    // selected UPI or Card.
    paymentGatewayMethod: {
      type: String,
      enum: ["upi", "card", "netbanking", "wallet", "emi", "paylater", ""],
      default: "",
    },

    razorpayOrderId: {
      type: String,
      default: null,
    },

    razorpayPaymentId: {
      type: String,
      default: null,
    },

    paymentStatus: {
      type: String,
      enum: ["Paid", "Refunded", "Cancelled"],
      default: "Paid",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);
// Prevent multiple bills from being created for the same Razorpay order
billSchema.index(
  { razorpayOrderId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      razorpayOrderId: { $type: "string" },
    },
  }
);

module.exports = mongoose.model("Bill", billSchema);
