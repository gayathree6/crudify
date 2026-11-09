const Bill = require("../models/Bill");
const Product = require("../models/Product");
const Return = require("../models/Return");

// Get the selected date range.
const getDateRange = (period) => {
  const end = new Date();
  const start = new Date(end);

  if (period === "7d") {
    start.setDate(start.getDate() - 6);
  } else if (period === "30d") {
    start.setDate(start.getDate() - 29);
  } else if (period === "12m") {
    start.setMonth(start.getMonth() - 11);
    start.setDate(1);
  } else {
    start.setHours(0, 0, 0, 0);
  }

  start.setHours(0, 0, 0, 0);

  return { start, end };
};

const getPreviousRange = (start, end) => {
  const duration = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration);

  return {
    start: previousStart,
    end: previousEnd,
  };
};

const round = (value) => Math.round((Number(value) || 0) * 100) / 100;
// Format dates using the server's local timezone.
const getLocalDateKey = (date) => {
  const d = new Date(date);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// GET /api/reports/overview
const getReportOverview = async (req, res) => {
  try {
    const period = ["today", "7d", "30d", "12m"].includes(
      req.query.period
    )
      ? req.query.period
      : "7d";

    const { start, end } = getDateRange(period);
    const previous = getPreviousRange(start, end);

    // Only non-cancelled bills count as sales.
    const bills = await Bill.find({
      createdAt: { $gte: start, $lte: end },
      paymentStatus: { $ne: "Cancelled" },
    })
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    const previousBills = await Bill.find({
      createdAt: {
        $gte: previous.start,
        $lte: previous.end,
      },
      paymentStatus: { $ne: "Cancelled" },
    }).lean();

    // Only approved returns count as refunds.
    const approvedReturns = await Return.find({
      status: "Approved",
      reviewedAt: { $gte: start, $lte: end },
    }).lean();

    const previousReturns = await Return.find({
      status: "Approved",
      reviewedAt: {
        $gte: previous.start,
        $lte: previous.end,
      },
    }).lean();

    const pendingReturns = await Return.countDocuments({
      status: "Pending",
    });

    const rejectedReturns = await Return.countDocuments({
      status: "Rejected",
      createdAt: { $gte: start, $lte: end },
    });

    const totalProducts = await Product.countDocuments({
      isActive: true,
    });

    const lowStockProducts = await Product.find({
      isActive: true,
      $expr: { $lte: ["$stock", "$lowStockThreshold"] },
    })
      .select("name sku stock lowStockThreshold")
      .sort({ stock: 1 })
      .lean();

    const grossRevenue = bills.reduce(
      (sum, bill) => sum + bill.grandTotal,
      0
    );

    const totalRefunds = approvedReturns.reduce(
      (sum, record) => sum + record.totalRefund,
      0
    );

    const netRevenue = grossRevenue - totalRefunds;

    const previousGrossRevenue = previousBills.reduce(
      (sum, bill) => sum + bill.grandTotal,
      0
    );

    const previousRefunds = previousReturns.reduce(
      (sum, record) => sum + record.totalRefund,
      0
    );

    const previousNetRevenue =
      previousGrossRevenue - previousRefunds;

    const previousNetOrders = previousBills.length;

    const revenueChange =
      previousNetRevenue > 0
        ? ((netRevenue - previousNetRevenue) /
            previousNetRevenue) *
          100
        : netRevenue > 0
        ? 100
        : 0;

    const ordersChange =
      previousNetOrders > 0
        ? ((bills.length - previousNetOrders) /
            previousNetOrders) *
          100
        : bills.length > 0
        ? 100
        : 0;

    // Payment method breakdown.
    const paymentBreakdown = ["Cash", "UPI", "Card"].map(
      (method) => {
        const methodBills = bills.filter(
          (bill) => bill.paymentMethod === method
        );

        const amount = methodBills.reduce(
          (sum, bill) => sum + bill.grandTotal,
          0
        );

        return {
          method,
          orders: methodBills.length,
          amount: round(amount),
        };
      }
    );

    // Sales trend.
    const salesByDate = {};

    bills.forEach((bill) => {
      const date = getLocalDateKey(bill.createdAt);

      if (!salesByDate[date]) {
        salesByDate[date] = {
          date,
          sales: 0,
          orders: 0,
        };
      }

      salesByDate[date].sales += bill.grandTotal;
      salesByDate[date].orders += 1;
    });

    const refundsByDate = {};

    approvedReturns.forEach((record) => {
    const date = getLocalDateKey(record.reviewedAt);
      refundsByDate[date] =
        (refundsByDate[date] || 0) + record.totalRefund;
    });

    const salesTrend = [];
    const cursor = new Date(start);
    const endDate = new Date(end);

    // For 12 months, show one point per month.
    if (period === "12m") {
      const monthly = {};

      bills.forEach((bill) => {
        const date = new Date(bill.createdAt);
        const key = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;

        if (!monthly[key]) {
          monthly[key] = {
            date: key,
            sales: 0,
            orders: 0,
          };
        }

        monthly[key].sales += bill.grandTotal;
        monthly[key].orders += 1;
      });

      approvedReturns.forEach((record) => {
        const date = new Date(record.reviewedAt);
        const key = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;

        if (!monthly[key]) {
          monthly[key] = {
            date: key,
            sales: 0,
            orders: 0,
          };
        }

        monthly[key].sales -= record.totalRefund;
      });

      const monthCursor = new Date(start);
      monthCursor.setDate(1);

      for (let i = 0; i < 12; i++) {
        const key = `${monthCursor.getFullYear()}-${String(
          monthCursor.getMonth() + 1
        ).padStart(2, "0")}`;

        const netSales = round(monthly[key]?.sales || 0);

salesTrend.push({
  date: key,
  label: monthCursor.toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  }),
  sales: netSales,
  revenue: netSales,
  orders: monthly[key]?.orders || 0,
});

        monthCursor.setMonth(monthCursor.getMonth() + 1);
      }
    } else {
      while (cursor <= endDate) {
       const date = getLocalDateKey(cursor);

        const gross = salesByDate[date]?.sales || 0;
        const refunds = refundsByDate[date] || 0;

      const netSales = round(gross - refunds);

salesTrend.push({
  date,
  label: cursor.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  }),
  sales: netSales,
  revenue: netSales,
  orders: salesByDate[date]?.orders || 0,
});

        cursor.setDate(cursor.getDate() + 1);
      }
    }

    // Best-selling products, with approved returned quantities deducted.
    const productSales = {};

    bills.forEach((bill) => {
      bill.items.forEach((item) => {
        const id = String(item.product);

        if (!productSales[id]) {
          productSales[id] = {
            productId: id,
            name: item.productName,
            sku: item.sku,
            quantity: 0,
            revenue: 0,
          };
        }

        productSales[id].quantity += item.quantity;
        productSales[id].revenue += item.total;
      });
    });

    approvedReturns.forEach((record) => {
      record.items.forEach((item) => {
        const id = String(item.product);

        if (productSales[id]) {
          productSales[id].quantity -= item.quantity;
          productSales[id].revenue -= item.refundAmount;
        }
      });
    });

    const topProducts = Object.values(productSales)
      .filter((item) => item.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map((item) => ({
        ...item,
        revenue: round(Math.max(0, item.revenue)),
      }));

   const recentTransactions = bills.slice(0, 8).map((bill) => ({
  _id: bill._id,
  id: bill._id,
  billNumber: bill.billNumber,
  date: bill.createdAt,
  createdAt: bill.createdAt,
  amount: round(bill.grandTotal - (bill.refundedAmount || 0)),
  netAmount: round(bill.grandTotal - (bill.refundedAmount || 0)),
  paymentMethod: bill.paymentMethod,
  paymentStatus: bill.paymentStatus,
  cashier: bill.createdBy?.name || "Staff",
}));

    res.status(200).json({
      success: true,
      period,
      summary: {
        grossRevenue: round(grossRevenue),
        totalRefunds: round(totalRefunds),
        netRevenue: round(netRevenue),
        totalOrders: bills.length,
        totalProducts,
        lowStockCount: lowStockProducts.length,
        pendingReturns,
        rejectedReturns,
        revenueChange: round(revenueChange),
        ordersChange: round(ordersChange),
      },
      salesTrend,
      paymentBreakdown,
      topProducts,
      lowStockProducts,
      recentTransactions,
      returnSummary: {
        approvedCount: approvedReturns.length,
        approvedAmount: round(totalRefunds),
        pendingCount: pendingReturns,
        rejectedCount: rejectedReturns,
      },
    });
  } catch (error) {
    console.error("Report error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to generate reports.",
    });
  }
};

module.exports = {
  getReportOverview,
};