const Bill = require("../models/Bill");
const Product = require("../models/Product");
const Return = require("../models/Return");

// Get the selected date range.
// Use Indian Standard Time (IST) for all report dates
const getISTParts = (date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = {};
  parts.forEach((part) => {
    if (part.type !== "literal") values[part.type] = part.value;
  });

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
};

const getISTDateKey = (date) => {
  const { year, month, day } = getISTParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const getISTStartOfDay = (date) => {
  const { year, month, day } = getISTParts(date);
  return new Date(Date.UTC(year, month - 1, day) - 330 * 60 * 1000);
};

const getDateRange = (period) => {
  const end = new Date();
  const todayStart = getISTStartOfDay(end);
  const start = new Date(todayStart);

  if (period === "7d") {
    start.setUTCDate(start.getUTCDate() - 6);
  } else if (period === "30d") {
    start.setUTCDate(start.getUTCDate() - 29);
  } else if (period === "12m") {
    const { year, month } = getISTParts(end);
    const firstMonth = new Date(Date.UTC(year, month - 12, 1));
    return {
      start: new Date(firstMonth.getTime() - 330 * 60 * 1000),
      end,
    };
  }

  return { start, end };
};

const getPreviousRange = (start, end) => {
  const duration = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration);

  return { start: previousStart, end: previousEnd };
};
const round = (value) => Math.round((Number(value) || 0) * 100) / 100;
// Format dates using the server's local timezone.
// Format dates consistently using Indian Standard Time (IST)
const getLocalDateKey = getISTDateKey;

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
       const { year, month } = getISTParts(bill.createdAt);
const key = `${year}-${String(month).padStart(2, "0")}`;

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
        const { year, month } = getISTParts(record.reviewedAt);
const key = `${year}-${String(month).padStart(2, "0")}`;

        if (!monthly[key]) {
          monthly[key] = {
            date: key,
            sales: 0,
            orders: 0,
          };
        }

        monthly[key].sales -= record.totalRefund;
      });

     const monthStart = getISTParts(start);

const monthCursor = new Date(
  Date.UTC(monthStart.year, monthStart.month - 1, 1)
);

for (let i = 0; i < 12; i++) {
  const year = monthCursor.getUTCFullYear();
  const month = monthCursor.getUTCMonth() + 1;

  const key = `${year}-${String(month).padStart(2, "0")}`;

  const netSales = round(monthly[key]?.sales || 0);

  salesTrend.push({
    date: key,
    label: new Intl.DateTimeFormat("en-IN", {
      timeZone: "UTC",
      month: "short",
      year: "2-digit",
    }).format(monthCursor),
    sales: netSales,
    revenue: netSales,
    orders: monthly[key]?.orders || 0,
  });

  monthCursor.setUTCMonth(monthCursor.getUTCMonth() + 1);
}
    } else {
      while (cursor <= endDate) {
       const date = getLocalDateKey(cursor);

        const gross = salesByDate[date]?.sales || 0;
        const refunds = refundsByDate[date] || 0;

      const netSales = round(gross - refunds);

salesTrend.push({
  date,
  label: new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
}).format(cursor),
  sales: netSales,
  revenue: netSales,
  orders: salesByDate[date]?.orders || 0,
});

       cursor.setUTCDate(cursor.getUTCDate() + 1);
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