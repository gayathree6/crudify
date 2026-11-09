import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  Search,
  RotateCcw,
  Receipt,
  Package,
  RefreshCw,
  IndianRupee,
  History,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  ShieldCheck,
  UserRound,
  LogOut,
  X,
} from "lucide-react";
import "./Returns.css";

const API_URL = "http://localhost:5000/api";

const getConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("crudifyToken")}`,
  },
});

function Returns() {
  const [searchParams] = useSearchParams();

 const [user, setUser] = useState(
  () => JSON.parse(localStorage.getItem("crudifyUser") || "{}")
);
  const isAdmin = user.role?.toLowerCase() === "admin";

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
const [showProfile, setShowProfile] = useState(false);

const [editingProfile, setEditingProfile] = useState(false);
const [profileName, setProfileName] = useState(user.name || "");
const [profileEmail, setProfileEmail] = useState(user.email || "");
const [selectedPhoto, setSelectedPhoto] = useState(null);
const [photoPreview, setPhotoPreview] = useState("");
const [removePhoto, setRemovePhoto] = useState(false);
const [profileSaving, setProfileSaving] = useState(false);
const [profileMessage, setProfileMessage] = useState("");
  const getProfileImageUrl = (image) => {
    if (!image) return "";
    if (image.startsWith("http")) return image;
    return `http://localhost:5000${image}`;
  };

  const handleLogout = () => {
    localStorage.removeItem("crudifyToken");
    localStorage.removeItem("crudifyUser");
    window.location.href = "/";
  };
  const handleProfileSave = async (e) => {
  e.preventDefault();

  if (!profileName.trim() || !profileEmail.trim()) {
    setProfileMessage("Name and email are required.");
    return;
  }

  try {
    setProfileSaving(true);
    setProfileMessage("");

    const formData = new FormData();
    formData.append("name", profileName.trim());
    formData.append("email", profileEmail.trim());

    if (selectedPhoto) {
      formData.append("image", selectedPhoto);
    }

    if (removePhoto) {
      formData.append("removeProfileImage", "true");
    }

    const response = await axios.put(
      `${API_URL}/auth/profile`,
      formData,
      getConfig()
    );

    const updatedUser = response.data.user;

    localStorage.setItem(
      "crudifyUser",
      JSON.stringify(updatedUser)
    );
    setUser(updatedUser);

    setProfileName(updatedUser.name || "");
    setProfileEmail(updatedUser.email || "");
    setSelectedPhoto(null);
    setPhotoPreview("");
    setRemovePhoto(false);
    setEditingProfile(false);

    setProfileMessage("Profile updated successfully!");

    
  } catch (error) {
    setProfileMessage(
      error.response?.data?.message ||
      "Unable to update profile."
    );
  } finally {
    setProfileSaving(false);
  }
};

  const [billNumber, setBillNumber] = useState("");
  const [bill, setBill] = useState(null);
  const [returnItems, setReturnItems] = useState({});
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("Cash");
  const [returns, setReturns] = useState([]);
  const [filter, setFilter] = useState("All");

  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Automatically load the selected invoice from Billing.
  useEffect(() => {
    const invoice = searchParams.get("bill");

    if (!invoice || isAdmin) return;

    setBillNumber(invoice);
    setBill(null);
    setReturnItems({});
    setError("");
    setMessage("");
    setLoading(true);

    const loadInvoice = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/returns/bill/${encodeURIComponent(invoice)}`,
          getConfig()
        );

        setBill(response.data.bill);
      } catch (err) {
        setError(
          err.response?.data?.message || "Unable to find this bill."
        );
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [searchParams, isAdmin]);

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/returns`,
        getConfig()
      );

      setReturns(response.data.returns || []);
    } catch (err) {
      console.error("Failed to fetch returns:", err);
      setError(
        err.response?.data?.message || "Unable to load return requests."
      );
    }
  };

  // Search invoice manually if needed.
  const searchBill = async (e) => {
    e.preventDefault();

    if (!billNumber.trim()) {
      setError("Please enter an invoice number.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    setBill(null);
    setReturnItems({});

    try {
      const response = await axios.get(
        `${API_URL}/returns/bill/${encodeURIComponent(
          billNumber.trim()
        )}`,
        getConfig()
      );

      setBill(response.data.bill);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to find this bill."
      );
    } finally {
      setLoading(false);
    }
  };

  // Update partial return quantity.
  const updateQuantity = (productId, quantity, available) => {
    const value = Math.max(
      0,
      Math.min(Number(quantity) || 0, available)
    );

    setReturnItems((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        quantity: value,
        condition: prev[productId]?.condition || "Resalable",
      },
    }));
  };

  const updateCondition = (productId, condition) => {
    setReturnItems((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        quantity: prev[productId]?.quantity || 0,
        condition,
      },
    }));
  };

  const selectedItems = bill
    ? bill.items
        .filter(
          (item) =>
            (returnItems[item.product]?.quantity || 0) > 0
        )
        .map((item) => ({
          product: item.product,
          quantity: returnItems[item.product].quantity,
          condition:
            returnItems[item.product].condition || "Resalable",
        }))
    : [];

  // Calculate refund for selected quantities only.
  const calculateRefund = () => {
    if (!bill) return 0;

    return bill.items.reduce((total, item) => {
      const quantity =
        returnItems[item.product]?.quantity || 0;

      if (!quantity) return total;

      const discountShare =
        bill.subtotal > 0
          ? (item.total / bill.subtotal) * (bill.discount || 0)
          : 0;

      const discountedTotal = item.total - discountShare;
      const refundPerUnit = discountedTotal / item.quantity;

      return total + refundPerUnit * quantity;
    }, 0);
  };

  // Submit return request.
  const processReturn = async () => {
    if (!bill || selectedItems.length === 0) {
      setError("Please select at least one product to return.");
      return;
    }

    if (!reason) {
      setError("Please select a return reason.");
      return;
    }

    setProcessing(true);
    setError("");
    setMessage("");

    try {
      const response = await axios.post(
        `${API_URL}/returns`,
        {
          billId: bill._id,
          items: selectedItems,
          reason,
          refundMethod,
        },
        getConfig()
      );

      setMessage(
        `Return request ${response.data.return.returnNumber} submitted successfully. Waiting for Admin approval.`
      );

      setBill(null);
      setBillNumber("");
      setReturnItems({});
      setReason("");
      setRefundMethod("Cash");

      await fetchReturns();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to submit return request."
      );
    } finally {
      setProcessing(false);
    }
  };

  // Admin approves a return.
  const approveReturn = async (returnId) => {
    const confirmed = window.confirm(
      "Are you sure you want to approve this return request?"
    );

    if (!confirmed) return;

    setReviewingId(returnId);
    setError("");
    setMessage("");

    try {
      const response = await axios.patch(
        `${API_URL}/returns/${returnId}/approve`,
        {},
        getConfig()
      );

      setMessage(
        response.data.message || "Return request approved successfully."
      );

      await fetchReturns();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to approve this request."
      );
    } finally {
      setReviewingId(null);
    }
  };

  // Admin rejects a return.
  const rejectReturn = async (returnId) => {
    const reviewNote = window.prompt(
      "Enter the reason for rejecting this return request:"
    );

    if (reviewNote === null) return;

    if (!reviewNote.trim()) {
      setError("Please enter a rejection reason.");
      return;
    }

    setReviewingId(returnId);
    setError("");
    setMessage("");

    try {
      const response = await axios.patch(
        `${API_URL}/returns/${returnId}/reject`,
        { reviewNote: reviewNote.trim() },
        getConfig()
      );

      setMessage(
        response.data.message || "Return request rejected."
      );

      await fetchReturns();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to reject this request."
      );
    } finally {
      setReviewingId(null);
    }
  };

  const filteredReturns = returns.filter((record) => {
    if (filter === "All") return true;
    return record.status === filter;
  });

  const pendingCount = returns.filter(
    (record) => record.status === "Pending"
  ).length;

  const approvedCount = returns.filter(
    (record) => record.status === "Approved"
  ).length;

  const rejectedCount = returns.filter(
    (record) => record.status === "Rejected"
  ).length;

  const getStatusClass = (status) => {
    return (status || "Pending").toLowerCase();
  };

  return (
    <div className="returns-page">
      {/* PAGE HEADER */}
      <div className="returns-header">
        <div>
          <span className="returns-eyebrow">
            CRUDIFY / RETURNS MANAGEMENT
          </span>

          <h1>Returns Workspace</h1>

          <p>
            {isAdmin
              ? "Review customer return requests and manage approvals."
              : "Manage customer returns and track refund requests."}
          </p>
        </div>

        {/* STAFF PROFILE */}
        <div className="returns-profile-wrapper">
          <button
            className="returns-profile-trigger"
            onClick={() => setProfileMenuOpen((prev) => !prev)}
          >
            <div className="returns-profile-avatar">
              {user.profileImage ? (
                <img
                  src={getProfileImageUrl(user.profileImage)}
                  alt={user.name || "Profile"}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                user.name?.charAt(0)?.toUpperCase() || "U"
              )}
            </div>

            <div className="returns-profile-details">
              <span>{isAdmin ? "Administrator" : "Cashier"}</span>
              <strong>{user.name || "User"}</strong>
            </div>
          </button>

          {profileMenuOpen && (
            <div className="returns-profile-dropdown">
              <div className="returns-profile-dropdown-heading">
                <div className="returns-profile-avatar">
                  {user.profileImage ? (
                    <img
                      src={getProfileImageUrl(user.profileImage)}
                      alt={user.name || "Profile"}
                    />
                  ) : (
                    user.name?.charAt(0)?.toUpperCase() || "U"
                  )}
                </div>

                <div>
                  <strong>{user.name || "User"}</strong>
                  <span>{user.email || "Account"}</span>
                </div>
              </div>

              <div className="returns-profile-divider" />

              <button
                onClick={() => {
                  setShowProfile(true);
                  setProfileMenuOpen(false);
                }}
              >
                <UserRound size={17} />
                View Profile
              </button>

              <button
                className="returns-profile-logout"
                onClick={handleLogout}
              >
                <LogOut size={17} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

    
      {/* EDITABLE PROFILE MODAL */}
      {showProfile && (
        <div
          className="returns-profile-modal-overlay"
          onClick={() => {
            setShowProfile(false);
            setEditingProfile(false);
          }}
        >
          <div
            className="returns-profile-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="returns-profile-modal-close"
              type="button"
              onClick={() => {
                setShowProfile(false);
                setEditingProfile(false);
              }}
            >
              <X size={20} />
            </button>

            <form onSubmit={handleProfileSave}>
              <div className="returns-profile-modal-photo">
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile preview" />
                ) : user.profileImage && !removePhoto ? (
                  <img
                    src={getProfileImageUrl(user.profileImage)}
                    alt={user.name || "Profile"}
                  />
                ) : (
                  <span>
                    {user.name?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                )}
              </div>

              {editingProfile && (
                <div className="returns-photo-actions">
                  <label className="returns-change-photo">
                    Change Photo
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        if (
                          !["image/jpeg", "image/png", "image/webp"].includes(file.type)
                        ) {
                          setProfileMessage("Please select a JPG, PNG or WEBP image.");
                          e.target.value = "";
                          return;
                        }

                        if (file.size > 5 * 1024 * 1024) {
                          setProfileMessage("Image must be smaller than 5 MB.");
                          e.target.value = "";
                          return;
                        }

                        setSelectedPhoto(file);
                        setPhotoPreview(URL.createObjectURL(file));
                        setRemovePhoto(false);
                        setProfileMessage("");
                      }}
                    />
                  </label>

                  {(user.profileImage || selectedPhoto) && (
                    <button
                      type="button"
                      className="returns-remove-photo"
                      onClick={() => {
                        setSelectedPhoto(null);
                        setPhotoPreview("");
                        setRemovePhoto(true);
                      }}
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              )}

              <h2>{user.name || "User"}</h2>

              <p className="returns-profile-role">
                {user.role || "Staff"}
              </p>

              {profileMessage && (
                <p className="returns-profile-message">
                  {profileMessage}
                </p>
              )}

              <div className="returns-profile-info">
                <span>Full Name</span>
                {editingProfile ? (
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                  />
                ) : (
                  <strong>{user.name || "—"}</strong>
                )}
              </div>

              <div className="returns-profile-info">
                <span>Email Address</span>
                {editingProfile ? (
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    required
                  />
                ) : (
                  <strong>{user.email || "—"}</strong>
                )}
              </div>

              <div className="returns-profile-info">
                <span>Account Role</span>
                <strong>{user.role || "Staff"}</strong>
              </div>

              <div className="returns-profile-actions">
                {editingProfile ? (
                  <>
                    <button
                      type="button"
                      className="returns-profile-close-button"
                      disabled={profileSaving}
                      onClick={() => {
                        setEditingProfile(false);
                        setProfileName(user.name || "");
                        setProfileEmail(user.email || "");
                        setSelectedPhoto(null);
                        setPhotoPreview("");
                        setRemovePhoto(false);
                        setProfileMessage("");
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="returns-profile-edit-button"
                      disabled={profileSaving}
                    >
                      {profileSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="returns-profile-edit-button"
                      onClick={() => {
                        setProfileName(user.name || "");
                        setProfileEmail(user.email || "");
                        setEditingProfile(true);
                        setProfileMessage("");
                      }}
                    >
                      Edit Profile
                    </button>

                    <button
                      type="button"
                      className="returns-profile-close-button"
                      onClick={() => setShowProfile(false)}
                    >
                      Close
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}


      {message && (
        <div className="returns-alert success">
          <CheckCircle size={18} />
          {message}
        </div>
      )}

      {error && (
        <div className="returns-alert error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* RETURN SUMMARY */}
      <div className="return-summary-grid">
        <div className="return-summary-card">
          <Clock size={20} />
          <span>Pending Requests</span>
          <strong>{pendingCount}</strong>
        </div>

        <div className="return-summary-card">
          <CheckCircle size={20} />
          <span>Approved Returns</span>
          <strong>{approvedCount}</strong>
        </div>

        <div className="return-summary-card">
          <XCircle size={20} />
          <span>Rejected Requests</span>
          <strong>{rejectedCount}</strong>
        </div>
      </div>

      {/* STAFF RETURN REQUEST FORM */}
      {!isAdmin && (
        <div className="returns-search-card">
          <div className="returns-section-heading">
            <div className="returns-icon-box">
              <Receipt size={20} />
            </div>

            <div>
              <h3>Find Original Bill</h3>
              <p>
                Enter the invoice number to submit a customer return request.
              </p>
            </div>
          </div>

          <form className="returns-search-form" onSubmit={searchBill}>
            <div className="returns-input-wrapper">
              <Search size={18} />

              <input
                type="text"
                placeholder="Enter invoice number (e.g. INV-123456)"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw size={16} className="returns-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search size={16} />
                  Find Bill
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ORIGINAL BILL AND RETURN QUANTITIES */}
      {bill && !isAdmin && (
        <div className="returns-bill-card">
          <div className="returns-bill-header">
            <div>
              <span className="returns-eyebrow">
                ORIGINAL TRANSACTION
              </span>

              <h3>{bill.billNumber}</h3>

              <p>
                {new Date(bill.createdAt).toLocaleString("en-IN")}
              </p>
            </div>

            <span
              className={`returns-status ${getStatusClass(
                bill.paymentStatus
              )}`}
            >
              {bill.paymentStatus}
            </span>
          </div>

          <div className="returns-bill-summary">
            <div>
              <span>Original Total</span>
              <strong>₹{Number(bill.grandTotal).toFixed(2)}</strong>
            </div>

            <div>
              <span>Already Refunded</span>
              <strong>
                ₹{Number(bill.refundedAmount || 0).toFixed(2)}
              </strong>
            </div>

            <div>
              <span>Payment Method</span>
              <strong>{bill.paymentMethod}</strong>
            </div>
          </div>

          <div className="returns-table-wrapper">
            <table className="returns-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Purchased</th>
                  <th>Returned</th>
                  <th>Available</th>
                  <th>Price</th>
                  <th>Return Qty</th>
                  <th>Condition</th>
                </tr>
              </thead>

              <tbody>
                {bill.items.map((item) => (
                  <tr key={item.product}>
                    <td>
                      <div className="returns-product-name">
                        <Package size={17} />
                        {item.productName}
                      </div>
                    </td>

                    <td>{item.sku || "—"}</td>
                    <td>{item.quantity}</td>
                    <td>{item.returnedQuantity || 0}</td>

                    <td>
                      <span className="returns-available">
                        {item.availableQuantity}
                      </span>
                    </td>

                    <td>
                      ₹{Number(item.price).toFixed(2)}
                    </td>

                    <td>
                      <input
                        className="returns-quantity-input"
                        type="number"
                        min="0"
                        max={item.availableQuantity}
                        value={
                          returnItems[item.product]?.quantity || ""
                        }
                        disabled={item.availableQuantity === 0}
                        placeholder="0"
                        onChange={(e) =>
                          updateQuantity(
                            item.product,
                            e.target.value,
                            item.availableQuantity
                          )
                        }
                      />
                    </td>

                    <td>
                      <select
                        className="return-condition-select"
                        value={
                          returnItems[item.product]?.condition ||
                          "Resalable"
                        }
                        disabled={
                          !returnItems[item.product]?.quantity
                        }
                        onChange={(e) =>
                          updateCondition(
                            item.product,
                            e.target.value
                          )
                        }
                      >
                        <option value="Resalable">Resalable</option>
                        <option value="Damaged">Damaged</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedItems.length > 0 && (
            <div className="returns-processing-card">
              <div className="returns-section-heading">
                <div className="returns-icon-box">
                  <RotateCcw size={20} />
                </div>

                <div>
                  <h3>Submit Return Request</h3>
                  <p>
                    The request will remain pending until Admin approval.
                  </p>
                </div>
              </div>

              <div className="returns-form-grid">
                <div>
                  <label>Refund Method</label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                  </select>
                </div>

                <div>
                  <label>Return Reason</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  >
                    <option value="">Select reason</option>
                    <option value="Damaged product">Damaged product</option>
                    <option value="Defective product">Defective product</option>
                    <option value="Wrong product">Wrong product</option>
                    <option value="Customer changed mind">
                      Customer changed mind
                    </option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="returns-refund-total">
                <div>
                  <span>Estimated Refund Amount</span>
                  <strong>₹{calculateRefund().toFixed(2)}</strong>
                </div>

                <IndianRupee size={25} />
              </div>

              <button
                className="returns-process-button"
                onClick={processReturn}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <RefreshCw size={17} className="returns-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle size={17} />
                    Submit Return Request
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ADMIN APPROVAL INFORMATION */}
      {isAdmin && (
        <div className="returns-admin-notice">
          <ShieldCheck size={21} />

          <div>
            <strong>Admin Approval Centre</strong>
            <p>
              Review pending requests carefully. Stock and refund records
              are updated only after approval.
            </p>
          </div>
        </div>
      )}

      {/* RETURN HISTORY */}
      <div className="returns-history-card">
        <div className="returns-history-header">
          <div className="returns-section-heading">
            <div className="returns-icon-box">
              <History size={20} />
            </div>

            <div>
              <h3>
                {isAdmin ? "Return Requests" : "My Return Requests"}
              </h3>

              <p>
                {isAdmin
                  ? "Review and manage submitted customer return requests."
                  : "Track the status of your submitted return requests."}
              </p>
            </div>
          </div>

          <button
            className="returns-refresh-button"
            onClick={fetchReturns}
            title="Refresh return history"
          >
            <RefreshCw size={17} />
          </button>
        </div>

        <div className="return-status-filters">
          {["All", "Pending", "Approved", "Rejected"].map((status) => (
            <button
              key={status}
              className={filter === status ? "active" : ""}
              onClick={() => setFilter(status)}
            >
              {status}

              {status === "Pending" && pendingCount > 0 && (
                <span>{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        <div className="returns-table-wrapper">
          <table className="returns-table">
            <thead>
              <tr>
                <th>Return ID</th>
                <th>Original Bill</th>
                <th>Products</th>
                <th>Refund Amount</th>
                <th>Refund Method</th>
                <th>Request Date</th>
                <th>Status</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>

            <tbody>
              {filteredReturns.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 8 : 7}
                    className="returns-empty"
                  >
                    No return requests found.
                  </td>
                </tr>
              ) : (
                filteredReturns.map((record) => (
                  <tr key={record._id}>
                    <td>
                      <strong>{record.returnNumber}</strong>
                    </td>

                    <td>{record.billNumber}</td>

                    <td>
                      {record.items.reduce(
                        (sum, item) => sum + item.quantity,
                        0
                      )}{" "}
                      item(s)
                    </td>

                    <td className="returns-money">
                      ₹{Number(record.totalRefund).toFixed(2)}
                    </td>

                    <td>{record.refundMethod}</td>

                    <td>
                      {new Date(record.createdAt).toLocaleDateString(
                        "en-IN"
                      )}
                    </td>

                    <td>
                      <span
                        className={`return-request-status ${getStatusClass(
                          record.status
                        )}`}
                      >
                        {record.status}
                      </span>
                    </td>

                    {isAdmin && (
                      <td>
                        {record.status === "Pending" ? (
                          <div className="return-review-actions">
                            <button
                              className="return-approve-button"
                              disabled={reviewingId === record._id}
                              onClick={() => approveReturn(record._id)}
                            >
                              <CheckCircle size={14} />
                              Approve
                            </button>

                            <button
                              className="return-reject-button"
                              disabled={reviewingId === record._id}
                              onClick={() => rejectReturn(record._id)}
                            >
                              <XCircle size={14} />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="return-reviewed-text">
                            {record.reviewedAt
                              ? new Date(
                                  record.reviewedAt
                                ).toLocaleDateString("en-IN")
                              : "Reviewed"}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Returns;