
const crypto = require("crypto");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");

const Product = require("../models/Product");
const Bill = require("../models/Bill");
const PaymentAttempt = require("../models/PaymentAttempt");

// Initialize Razorpay
const getRazorpay = () => {
  if (
    !process.env.RAZORPAY_KEY_ID ||
    !process.env.RAZORPAY_KEY_SECRET
  ) {
    throw new Error("Razorpay API keys are missing in backend .env");
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// CREATE RAZORPAY ORDER
const createOrder = async (req, res) => {
  try {
    const { items, discount = 0 } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Add at least one product.",
      });
    }

    const discountValue = Number(discount);

    if (!Number.isFinite(discountValue) || discountValue < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid discount.",
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

    // Calculate amount using database prices
    let subtotal = 0;
    const productItems = [];

    for (const [id, quantity] of quantities) {
      const product = await Product.findOne({
        _id: id,
        isActive: true,
      }).lean();

      if (!product) {
        return res.status(400).json({
          success: false,
          message: "Selected product is unavailable.",
        });
      }

      if (product.stock < quantity) {
        return res.status(409).json({
          success: false,
          message: `Insufficient stock for ${product.name}.`,
        });
      }

      subtotal += Number(product.price) * quantity;

      productItems.push({
        product: product._id,
        quantity,
      });
    }

    if (discountValue > subtotal) {
      return res.status(400).json({
        success: false,
        message: "Discount cannot exceed subtotal.",
      });
    }

    // GST is currently disabled in CRUDIFY
    const taxAmount = 0;
    const grandTotal = subtotal - discountValue + taxAmount;

    // Razorpay accepts amounts in paise
    const amountPaise = Math.round(grandTotal * 100);

    if (amountPaise < 100) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be at least ₹1.",
      });
    }

    const razorpay = getRazorpay();

    // Create order in Razorpay
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `crudify_${Date.now()}`,
      notes: {
        staffId: String(req.user._id),
        source: "CRUDIFY_POS",
      },
    });

    // Save payment attempt in MongoDB
    await PaymentAttempt.create({
      razorpayOrderId: order.id,
      staff: req.user._id,
      items: productItems,
      subtotal,
      discount: discountValue,
      taxAmount,
      grandTotal,
      amountPaise,
      status: "created",
    });

    return res.status(201).json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      keyId: process.env.RAZORPAY_KEY_ID,
    });

  } catch (error) {
    console.error("Create order error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to create payment order.",
    });
  }
};

// VERIFY RAZORPAY PAYMENT AND CREATE BILL
const verifyPayment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification details are missing.",
      });
    }

    const attempt = await PaymentAttempt.findOne({
      razorpayOrderId: razorpay_order_id,
      staff: req.user._id,
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Payment order not found.",
      });
    }

   
// Prevent duplicate bill creation
if (attempt.status === "paid" && attempt.bill) {

  // Ensure the same payment ID is being used
  if (attempt.razorpayPaymentId !== razorpay_payment_id) {
    return res.status(409).json({
      success: false,
      message: "This order was already completed with a different payment.",
    });
  }

  const existingBill = await Bill.findById(attempt.bill);

  return res.status(200).json({
    success: true,
    message: "Payment already verified.",
    bill: existingBill,
  });
}
    // Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(
        `${razorpay_order_id}|${razorpay_payment_id}`
      )
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const receivedBuffer = Buffer.from(
      String(razorpay_signature),
      "hex"
    );

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment signature verification failed.",
      });
    }

    // Verify payment directly with Razorpay
    const razorpay = getRazorpay();

    const payment = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    if (
      payment.order_id !== attempt.razorpayOrderId ||
      payment.amount !== attempt.amountPaise ||
      payment.currency !== "INR" ||
      payment.status !== "captured"
    ) {
      return res.status(409).json({
        success: false,
        message: "Payment is not captured or details do not match.",
      });
    }

    let createdBill;

    await session.withTransaction(async () => {
  // Atomically claim the payment attempt
  const current = await PaymentAttempt.findOneAndUpdate(
    {
      _id: attempt._id,
      status: "created",
    },
    {
      $set: { status: "processing" },
    },
    {
      new: true,
      session,
    }
  );

  // Check whether another request already processed this payment
  if (!current) {
    const latest = await PaymentAttempt.findById(
      attempt._id
    ).session(session);

    if (
      latest?.status === "paid" &&
      latest.bill &&
      latest.razorpayPaymentId === razorpay_payment_id
    ) {
      createdBill = await Bill.findById(
        latest.bill
      ).session(session);

      return;
    }

    throw new Error(
      "This payment is already being processed or cannot be verified."
    );
  }

  const billItems = [];

  // Deduct stock after payment verification
  for (const item of current.items) {
    const product = await Product.findOneAndUpdate(
      {
        _id: item.product,
        isActive: true,
        stock: { $gte: item.quantity },
      },
      {
        $inc: { stock: -item.quantity },
      },
      {
        new: true,
        session,
      }
    );

    if (!product) {
      throw new Error(
        "Payment captured, but stock is insufficient. Manual reconciliation or refund is required."
      );
    }

    const price = Number(product.price);

    billItems.push({
      product: product._id,
      productName: product.name,
      sku: product.sku,
      quantity: item.quantity,
      price,
      total: price * item.quantity,
    });
  }

  const [bill] = await Bill.create(
    [
      {
        billNumber: `INV-${Date.now()}-${crypto.randomInt(100, 1000)}`,
        items: billItems,
        subtotal: current.subtotal,
        discount: current.discount,
        taxAmount: current.taxAmount,
        grandTotal: current.grandTotal,
        paymentMethod: "Razorpay",
        paymentGatewayMethod: payment.method || "",
        paymentStatus: "Paid",
        razorpayOrderId: current.razorpayOrderId,
        razorpayPaymentId: razorpay_payment_id,
        createdBy: current.staff,
      },
    ],
    { session }
  );

  current.status = "paid";
  current.razorpayPaymentId = razorpay_payment_id;
  current.verifiedAt = new Date();
  current.bill = bill._id;

  await current.save({ session });

  createdBill = bill;
});

    const populatedBill = await Bill.findById(
      createdBill._id
    )
      .populate("createdBy", "name email")
      .populate("items.product", "name sku")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Payment successful and bill created.",
      bill: populatedBill,
    });

  } catch (error) {
    console.error("Payment verification error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Payment verification failed.",
    });

  } finally {
    await session.endSession();
  }
};

module.exports = {
  createOrder,
  verifyPayment,
};
