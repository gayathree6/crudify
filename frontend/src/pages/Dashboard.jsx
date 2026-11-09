
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import {
  IndianRupee,
  ShoppingBag,
  Package,
  AlertTriangle,
  ArrowUpRight,
  MoreHorizontal,
  TrendingUp,
  RefreshCw,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const REPORT_API = "http://localhost:5000/api/reports/overview";

function Dashboard() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("crudifyUser") || "{}");
  const token = localStorage.getItem("crudifyToken");

  const [todayReport, setTodayReport] = useState(null);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (!token) {
        setError("Please log in again to view dashboard data.");
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [todayResponse, weeklyResponse] = await Promise.all([
        fetch(`${REPORT_API}?period=today`, { headers }),
        fetch(`${REPORT_API}?period=7d`, { headers }),
      ]);

      const todayData = await todayResponse.json();
      const weeklyData = await weeklyResponse.json();

      if (!todayResponse.ok) {
        throw new Error(todayData.message || "Unable to load today's report.");
      }

      if (!weeklyResponse.ok) {
        throw new Error(weeklyData.message || "Unable to load weekly report.");
      }

      setTodayReport(todayData);
      setWeeklyReport(weeklyData);
    } catch (err) {
      console.error("Dashboard report error:", err);
      setError(err.message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboardData();

    // Refresh dashboard data every 30 seconds.
    const interval = setInterval(fetchDashboardData, 30000);

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const formatMoney = (amount = 0) =>
    `₹${Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const todaySummary = todayReport?.summary || {};
  const weeklySummary = weeklyReport?.summary || {};

  const salesData = (weeklyReport?.salesTrend || []).map((item) => ({
    day: item.label || item.day || item.date || "",
    sales: Number(item.revenue || 0),
  }));

  const transactions = weeklyReport?.recentTransactions || [];

  const stats = [
    {
      title: "Today's Revenue",
      value: formatMoney(todaySummary.netRevenue),
      change: "Today's net sales",
      icon: IndianRupee,
      color: "gold",
    },
    {
      title: "Total Orders",
      value: todaySummary.totalOrders || 0,
      change: "Today's transactions",
      icon: ShoppingBag,
      color: "blue",
    },
    {
      title: "Total Products",
      value: todaySummary.totalProducts || 0,
      change: "Active products in inventory",
      icon: Package,
      color: "purple",
    },
    {
      title: "Low Stock Items",
      value: todaySummary.lowStockCount || 0,
      change: "Items need attention",
      icon: AlertTriangle,
      color: "red",
    },
  ];

  const todayDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <span className="page-eyebrow">OVERVIEW</span>
          <h1>Dashboard</h1>
          <p>
            Welcome back, {user.name || "Admin"}. Here's your store overview.
          </p>
        </div>

        <div className="dashboard-date">
          <span>Today</span>
          <strong>{todayDate}</strong>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center">
          <span>{error}</span>
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={fetchDashboardData}
          >
            Try Again
          </button>
        </div>
      )}

      <div className="stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div className="stat-card" key={stat.title}>
              <div className="stat-top">
                <div className={`stat-icon ${stat.color}`}>
                  <Icon size={21} />
                </div>

                <MoreHorizontal size={21} className="stat-more" />
              </div>

              <p>{stat.title}</p>

              <h2>
                {loading ? "..." : stat.value}
              </h2>

              <span className="stat-description">{stat.change}</span>
            </div>
          );
        })}
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-panel sales-panel">
          <div className="panel-heading">
            <div>
              <h3>Sales Overview</h3>
              <p>Actual net sales performance - last 7 days</p>
            </div>

            <button
              className="chart-period"
              onClick={fetchDashboardData}
              title="Refresh sales data"
              disabled={loading}
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>

          <div className="chart-placeholder">
            {loading ? (
              <div className="dashboard-chart-message">
                Loading sales data...
              </div>
            ) : salesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient
                      id="salesGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#c7a66a"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="#c7a66a"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#eee9df"
                  />

                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#969084", fontSize: 12 }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#969084", fontSize: 11 }}
                    tickFormatter={(value) =>
                      `₹${Number(value).toLocaleString("en-IN")}`
                    }
                  />

                  <Tooltip
                    formatter={(value) => [formatMoney(value), "Net Sales"]}
                  />

                  <Area
                    type="monotone"
                    dataKey="sales"
                    name="Net Sales"
                    stroke="#b49358"
                    strokeWidth={3}
                    fill="url(#salesGradient)"
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="dashboard-chart-message">
                No sales recorded in this period.
              </div>
            )}
          </div>
        </section>

        <section className="dashboard-panel quick-panel">
          <div className="panel-heading">
            <div>
              <h3>Quick Actions</h3>
              <p>Common store operations</p>
            </div>
          </div>

          <div className="quick-actions">
            <button onClick={() => navigate("/admin/products")}>
              <Package size={20} />
              <span>Add Product</span>
              <ArrowUpRight size={17} />
            </button>

            <button onClick={() => navigate("/admin/staff")}>
              <TrendingUp size={20} />
              <span>Manage Staff</span>
              <ArrowUpRight size={17} />
            </button>
          </div>

          <div className="inventory-notice">
            <AlertTriangle size={19} />

            <div>
              <strong>Inventory monitoring</strong>
              <p>Check stock levels regularly to avoid shortages.</p>
            </div>
          </div>
        </section>
      </div>

      <section className="dashboard-panel transactions-panel">
        <div className="panel-heading">
          <div>
            <h3>Recent Transactions</h3>
            <p>Your latest billing activity</p>
          </div>

          <button
            className="view-all-button"
            onClick={() => navigate("/admin/transactions")}
          >
            View all <ArrowUpRight size={15} />
          </button>
        </div>

        <div className="table-responsive">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Cashier</th>
                <th>Date</th>
                <th>Net Amount</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="empty-transactions">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length > 0 ? (
                transactions.map((transaction) => (
                  <tr key={transaction._id}>
                    <td>{transaction.billNumber || "—"}</td>
                    <td>{transaction.cashier || "—"}</td>
                    <td>
                      {transaction.createdAt
                        ? new Date(transaction.createdAt).toLocaleString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "—"}
                    </td>
                    <td>{formatMoney(transaction.netAmount)}</td>
                    <td>
                      <span className={`transaction-status ${String(
                        transaction.paymentStatus || ""
                      ).toLowerCase()}`}>
                        {transaction.paymentStatus || "—"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="empty-transactions">
                    <ShoppingBag size={25} />
                    <strong>No transactions yet</strong>
                    <span>Completed bills will appear here.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
