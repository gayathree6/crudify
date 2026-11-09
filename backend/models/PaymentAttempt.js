const mongoose = require("mongoose");

const paymentAttemptSchema = new mongoose.Schema(
  {
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
      },
    ],
    subtotal: Number,
    discount: Number,
    taxAmount: Number,
    grandTotal: Number,
    amountPaise: Number,
   status: {
  type: String,
  enum: ["created", "processing", "paid", "failed"],
  default: "created",
},
failureReason: {
  type: String,
  default: "",
},
    bill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bill",
      default: null,
    },
    verifiedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentAttempt", paymentAttemptSchema);