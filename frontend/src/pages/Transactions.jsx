
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, Receipt, Eye, X } from "lucide-react";
import { API } from "../services/api";
import "./Transactions.css";

// Get profile image URL using the existing Axios base URL
const getProfileImageUrl = (image) => {
  if (!image) return "";

  if (/^https?:\/\//i.test(image)) {
    return image;
  }

  const apiBaseURL = API.defaults.baseURL || "https://crudify-backend-qvx1.onrender.com/api";
  const serverURL = apiBaseURL.replace(/\/api\/?$/, "").replace(/\/$/, "");

  return `${serverURL}/${image.replace(/^\/+/, "")}`;
};

// Cashier information
function CashierInfo({ cashier }) {
  const name = cashier?.name || "Staff";
  const imageUrl = getProfileImageUrl(cashier?.profileImage);

  return (
    <div className="transaction-cashier">
      <div className="transaction-cashier-avatar">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={`${name}'s profile`}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        )}
        <span>{name.charAt(0).toUpperCase()}</span>
      </div>

      <strong>{name}</strong>
    </div>
  );
}

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBill, setSelectedBill] = useState(null);

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await API.get("/bills");

      const data = response.data;

      const bills = Array.isArray(data)
        ? data
        : data?.bills || data?.data || [];

      setTransactions(Array.isArray(bills) ? bills : []);
    } catch (err) {
      console.error("Transaction fetch error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load transactions. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial API call
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Currency formatting
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0);
  };

  // Search and filter
  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return transactions.filter((bill) => {
      const billNumber = String(bill.billNumber || bill._id || "").toLowerCase();
      const cashierName = String(bill.createdBy?.name || "").toLowerCase();

      const matchesSearch =
        billNumber.includes(query) || cashierName.includes(query);

      const matchesPayment =
        paymentFilter === "All" ||
        bill.paymentMethod === paymentFilter;

      const matchesStatus =
        statusFilter === "All" ||
        (bill.paymentStatus || "Paid") === statusFilter;

      return matchesSearch && matchesPayment && matchesStatus;
    });
  }, [transactions, search, paymentFilter, statusFilter]);

  // Statistics
  const totalSales = transactions
    .filter((bill) => (bill.paymentStatus || "Paid") === "Paid")
    .reduce((sum, bill) => sum + (Number(bill.grandTotal) || 0), 0);

  const paidBills = transactions.filter(
    (bill) => (bill.paymentStatus || "Paid") === "Paid"
  ).length;

  const getStatusClass = (status) => {
    return String(status || "Paid")
      .toLowerCase()
      .replace(/\s+/g, "-");
  };

  return (
    <div className="transactions-page">
      {/* HEADER */}
      <div className="transactions-header">
        <div>
          <span className="transactions-eyebrow">
            CRUDIFY / SALES MANAGEMENT
          </span>

          <h1>Transactions</h1>

          <p>Monitor and manage all recorded sales.</p>
        </div>

        <button
          type="button"
          className="transactions-refresh"
          onClick={fetchTransactions}
          disabled={loading}
        >
          <RefreshCw size={16} />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* STATISTICS */}
      <div className="transactions-stats">
        <div className="transaction-stat">
          <span>Total Transactions</span>
          <strong>{transactions.length}</strong>
        </div>

        <div className="transaction-stat">
          <span>Total Sales</span>
          <strong>{formatCurrency(totalSales)}</strong>
        </div>

        <div className="transaction-stat">
          <span>Paid Bills</span>
          <strong>{paidBills}</strong>
        </div>
      </div>

      {/* TRANSACTIONS CARD */}
      <div className="transactions-card">
        {/* SEARCH AND FILTERS */}
        <div className="transactions-toolbar">
          <div className="transactions-search">
            <Search size={18} />

            <input
              type="search"
              placeholder="Search invoice or cashier..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            aria-label="Filter by payment method"
            value={paymentFilter}
            onChange={(event) => setPaymentFilter(event.target.value)}
          >
            <option value="All">All Payment Methods</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
          </select>

          <select
            aria-label="Filter by payment status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Refunded">Refunded</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Pending">Pending</option>
          </select>
        </div>

        {/* ERROR */}
        {error && (
          <div className="transactions-error" role="alert">
            {error}
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <div className="transactions-empty">
            <RefreshCw size={25} />
            <strong>Loading transactions...</strong>
          </div>
        ) : filteredTransactions.length === 0 ? (
          /* EMPTY STATE */
          <div className="transactions-empty">
            <Receipt size={35} />
            <strong>No transactions found</strong>
            <span>Try changing your search or filters.</span>
          </div>
        ) : (
          /* TRANSACTIONS TABLE */
          <div className="transactions-table-wrap">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Invoice Number</th>
                  <th>Cashier</th>
                  <th>Date</th>
                  <th>Payment</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredTransactions.map((bill) => (
                  <tr key={bill._id}>
                    <td>
                      <strong>{bill.billNumber || bill._id}</strong>
                    </td>

                    <td>
                      <CashierInfo cashier={bill.createdBy} />
                    </td>

                    <td>
                      {bill.createdAt
                        ? new Date(bill.createdAt).toLocaleDateString("en-IN")
                        : "-"}
                    </td>

                    <td>{bill.paymentMethod || "-"}</td>

                    <td>{formatCurrency(bill.grandTotal)}</td>

                    <td>
                      <span
                        className={`transaction-status ${getStatusClass(
                          bill.paymentStatus
                        )}`}
                      >
                        {bill.paymentStatus || "Paid"}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="transaction-view"
                        onClick={() => setSelectedBill(bill)}
                        title="View transaction"
                      >
                        <Eye size={16} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TRANSACTION DETAILS MODAL */}
      {selectedBill && (
        <div
          className="transaction-modal-overlay"
          onClick={() => setSelectedBill(null)}
        >
          <div
            className="transaction-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="transaction-modal-header">
              <div>
                <span>TRANSACTION DETAILS</span>

                <h2 id="transaction-modal-title">
                  {selectedBill.billNumber || selectedBill._id}
                </h2>
              </div>

              <button
                type="button"
                aria-label="Close transaction details"
                onClick={() => setSelectedBill(null)}
              >
                <X size={19} />
              </button>
            </div>

            {/* BILL INFORMATION */}
            <div className="transaction-modal-info">
              <div className="transaction-modal-cashier">
                <span>Cashier</span>
                <CashierInfo cashier={selectedBill.createdBy} />
              </div>

              <p>
                Date:{" "}
                <strong>
                  {selectedBill.createdAt
                    ? new Date(selectedBill.createdAt).toLocaleString("en-IN")
                    : "-"}
                </strong>
              </p>

              <p>
                Payment:{" "}
                <strong>{selectedBill.paymentMethod || "-"}</strong>
              </p>

              <p>
                Status:{" "}
                <strong>{selectedBill.paymentStatus || "Paid"}</strong>
              </p>
            </div>

            {/* PURCHASED ITEMS */}
            <h3>Purchased Items</h3>

            <div className="transactions-table-wrap">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {(selectedBill.items || []).map((item, index) => (
                    <tr key={item._id || index}>
                      <td>
                        {item.productName || item.product?.name || "Product"}
                      </td>

                      <td>{item.quantity ?? 0}</td>

                      <td>{formatCurrency(item.price)}</td>

                      <td>
                        {formatCurrency(
                          item.total ??
                            Number(item.price || 0) *
                              Number(item.quantity || 0)
                        )}
                      </td>
                    </tr>
                  ))}

                  {(!selectedBill.items ||
                    selectedBill.items.length === 0) && (
                    <tr>
                      <td colSpan="4">No item details available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* GRAND TOTAL */}
            <div className="transaction-modal-total">
              <span>Grand Total</span>
              <strong>{formatCurrency(selectedBill.grandTotal)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Transactions;
