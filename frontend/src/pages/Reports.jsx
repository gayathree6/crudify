
import { useEffect, useState } from "react";
import axios from "axios";
import {
  IndianRupee,
  ShoppingBag,
  Package,
  AlertTriangle,
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
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import "./Reports.css";

const API = "http://localhost:5000/api/reports/overview";

function Reports() {
  const [period, setPeriod] = useState("7d");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("crudifyToken");

      const response = await axios.get(`${API}?period=${period}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setReport(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load reports. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [period]);

  if (loading) {
    return <div className="reports-loading">Loading reports...</div>;
  }

  if (error) {
    return (
      <div className="reports-page">
        <div className="reports-error">
          <p>{error}</p>
          <button onClick={fetchReports}>Try Again</button>
        </div>
      </div>
    );
  }

  const summary = report?.summary || {};
  const salesTrend = report?.salesTrend || [];
  const payments = report?.paymentBreakdown || [];
  const topProducts = report?.topProducts || [];
  const lowStock = report?.lowStockProducts || [];
  const recentTransactions = report?.recentTransactions || [];
  const returns = report?.returnSummary || {};

  const formatMoney = (amount = 0) =>
    `₹${Number(amount || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;

  const paymentColors = ["#b28a4a", "#455c4a", "#8b9b83"];

  return (
    <div className="reports-page">
      <div className="reports-heading">
        <div>
          <span className="reports-eyebrow">BUSINESS INSIGHTS</span>
          <h1>Reports & Analytics</h1>
          <p>Monitor your retail business performance and operations.</p>
        </div>

        <button className="reports-refresh" onClick={fetchReports}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="reports-periods">
        {[
          ["today", "Today"],
          ["7d", "7 Days"],
          ["30d", "30 Days"],
          ["12m", "12 Months"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={period === value ? "active" : ""}
            onClick={() => setPeriod(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="reports-stats">
        <div className="report-stat-card">
          <div className="report-stat-icon"><IndianRupee /></div>
          <span>Net Revenue</span>
          <h2>{formatMoney(summary.netRevenue)}</h2>
          <small>After approved refunds</small>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-icon"><ShoppingBag /></div>
          <span>Total Orders</span>
          <h2>{summary.totalOrders || 0}</h2>
          <small>Non-cancelled bills</small>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-icon"><Package /></div>
          <span>Total Products</span>
          <h2>{summary.totalProducts || 0}</h2>
          <small>Active products</small>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-icon warning"><AlertTriangle /></div>
          <span>Low Stock Items</span>
          <h2>{summary.lowStockCount || 0}</h2>
          <small>Need stock attention</small>
        </div>
      </div>

      <div className="reports-chart-grid">
        <section className="reports-panel reports-sales-panel">
          <div className="reports-panel-heading">
            <div>
              <h3>Sales Performance</h3>
              <p>Revenue trend for the selected period</p>
            </div>
            <TrendingUp size={20} />
          </div>

          <div className="reports-chart">
            {salesTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#b28a4a" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#b28a4a" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatMoney(value)} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#b28a4a"
                    fill="url(#salesGradient)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="reports-empty">No sales data available.</div>
            )}
          </div>
        </section>

        <section className="reports-panel">
          <div className="reports-panel-heading">
            <div>
              <h3>Payment Breakdown</h3>
              <p>Sales by payment method</p>
            </div>
          </div>

          <div className="reports-chart payment-chart">
            {payments.some((item) => Number(item.amount) > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={payments}
                    dataKey="amount"
                    nameKey="method"
                    cx="50%"
                    cy="45%"
                    outerRadius={90}
                    label
                  >
                    {payments.map((item, index) => (
                      <Cell
                        key={item.method}
                        fill={paymentColors[index % paymentColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatMoney(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="reports-empty">No payment data available.</div>
            )}
          </div>
        </section>
      </div>

      <div className="reports-chart-grid">
        <section className="reports-panel">
          <div className="reports-panel-heading">
            <div>
              <h3>Top Selling Products</h3>
              <p>Products ranked by quantity sold</p>
            </div>
          </div>

          <div className="reports-chart">
            {topProducts.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#455c4a" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="reports-empty">No product sales available.</div>
            )}
          </div>
        </section>

        <section className="reports-panel">
          <div className="reports-panel-heading">
            <div>
              <h3>Returns Overview</h3>
              <p>Return request status</p>
            </div>
          </div>

          <div className="return-report-list">
            <div><span>Approved Returns</span><strong>{returns.approvedCount || 0}</strong></div>
            <div><span>Refund Amount</span><strong>{formatMoney(returns.approvedAmount)}</strong></div>
            <div><span>Pending Returns</span><strong>{returns.pendingCount || 0}</strong></div>
            <div><span>Rejected Returns</span><strong>{returns.rejectedCount || 0}</strong></div>
          </div>
        </section>
      </div>

      <section className="reports-panel reports-table-panel">
        <div className="reports-panel-heading">
          <div>
            <h3>Low Stock Products</h3>
            <p>Products that need restocking</p>
          </div>
        </div>

        <div className="reports-table-wrapper">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Current Stock</th>
                <th>Threshold</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.length ? lowStock.map((product) => (
                <tr key={product._id}>
                  <td>{product.name}</td>
                  <td>{product.sku}</td>
                  <td>{product.stock}</td>
                  <td>{product.lowStockThreshold}</td>
                </tr>
              )) : (
                <tr><td colSpan="4" className="reports-empty-cell">No low-stock products.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="reports-panel reports-table-panel">
        <div className="reports-panel-heading">
          <div>
            <h3>Recent Transactions</h3>
            <p>Latest billing activity</p>
          </div>
        </div>

        <div className="reports-table-wrapper">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Cashier</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Net Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.length ? recentTransactions.map((item) => (
                <tr key={item._id}>
                  <td>{item.billNumber}</td>
                  <td>{new Date(item.createdAt).toLocaleDateString("en-IN")}</td>
                  <td>{item.cashier || "—"}</td>
                  <td>{item.paymentMethod}</td>
                  <td>{item.paymentStatus}</td>
                  <td>{formatMoney(item.netAmount)}</td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="reports-empty-cell">No transactions found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default Reports;
