import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  Package,
  RefreshCw,
  Printer,
  X,
  CheckCircle,
  UserRound,
  LogOut,
  Camera,
} from "lucide-react";
import { API } from "../services/api";
import "./Billing.css";
import { useNavigate } from "react-router-dom";
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");

    script.src = "https://checkout.razorpay.com/v1/checkout.js";

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
};

const getProfileImageUrl = (image) => {
  if (!image) return "";
  if (image.startsWith("http")) return image;
  return `http://localhost:5000${image}`;
};

function CashierInfo({ name, image }) {
  const imageUrl = getProfileImageUrl(image);

  return (
    <div className="billing-cashier-info">
      <div className="billing-cashier-avatar">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={`${name || "Staff"} profile`}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        <span>{name?.charAt(0)?.toUpperCase() || "S"}</span>
      </div>
      <strong>{name || "Staff"}</strong>
    </div>
  );
}

function Billing() {
  const navigate = useNavigate();

  const [billSearch, setBillSearch] = useState("");
  const [billPaymentFilter, setBillPaymentFilter] = useState("All");
  const [activeBillingTab, setActiveBillingTab] = useState("sale");

  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("crudifyUser") || "{}")
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

  const handleLogout = () => {
    localStorage.removeItem("crudifyToken");
    localStorage.removeItem("crudifyUser");
    window.location.href = "/";
  };

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [discount, setDiscount] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastBill, setLastBill] = useState(null);
  const [sales, setSales] = useState([]);

  const invoiceRef = useRef(null);

  useEffect(() => {
    if (lastBill && invoiceRef.current) {
      invoiceRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [lastBill]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const productResponse = await API.get("/products");

      const productList =
        productResponse.data.products ||
        productResponse.data.data ||
        [];

      setProducts(productList.filter((p) => p.isActive !== false));

      try {
        const salesResponse = await API.get("/bills");

        setSales(
          salesResponse.data.bills ||
          salesResponse.data.data ||
          []
        );
      } catch {
        setSales([]);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load products. Please check your connection."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredProducts = useMemo(() => {
    const value = search.trim().toLowerCase();

    return products.filter((product) => {
      return (
        product.name?.toLowerCase().includes(value) ||
        product.sku?.toLowerCase().includes(value) ||
        product.barcode?.toLowerCase().includes(value) ||
        product.category?.toLowerCase().includes(value)
      );
    });
  }, [products, search]);

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const searchValue = billSearch.trim().toLowerCase();

      const matchesSearch =
        !searchValue ||
        sale.billNumber?.toLowerCase().includes(searchValue);

      const matchesPayment =
        billPaymentFilter === "All" ||
        sale.paymentMethod === billPaymentFilter;

      return matchesSearch && matchesPayment;
    });
  }, [sales, billSearch, billPaymentFilter]);

  const subtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const discountAmount = Math.min(
    subtotal,
    Math.max(0, Number(discount) || 0)
  );

  const taxableAmount = subtotal - discountAmount;
  const taxAmount = 0;
  const grandTotal = taxableAmount + taxAmount;

  const addToCart = (product) => {
    setError("");
    setMessage("");

    if (product.stock <= 0) {
      setError("This product is out of stock.");
      return;
    }

    setCart((current) => {
      const existing = current.find(
        (item) => item._id === product._id
      );

      if (existing) {
        if (existing.quantity >= product.stock) {
          setError("Available stock limit reached.");
          return current;
        }

        return current.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...current,
        {
          _id: product._id,
          name: product.name,
          sku: product.sku,
          price: Number(product.price),
          stock: Number(product.stock),
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (id, change) => {
    setCart((current) =>
      current
        .map((item) => {
          if (item._id !== id) return item;

          const quantity = item.quantity + change;

          if (quantity <= 0) return null;

          if (quantity > item.stock) {
            setError("Available stock limit reached.");
            return item;
          }

          return { ...item, quantity };
        })
        .filter(Boolean)
    );
  };

  const removeItem = (id) => {
    setCart((current) =>
      current.filter((item) => item._id !== id)
    );
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setError("");
    setMessage("");
  };

  
const handleCheckout = async () => {
  if (!cart.length) {
    setError("Please add products to the cart.");
    return;
  }

  try {
    setSaving(true);
    setError("");
    setMessage("");

    // CASH PAYMENT — use the existing billing API
    if (paymentMethod === "Cash") {
      const response = await API.post("/bills", {
        items: cart.map((item) => ({
          product: item._id,
          quantity: item.quantity,
        })),
        paymentMethod: "Cash",
        discount: discountAmount,
      });

      const bill =
        response.data.bill ||
        response.data.data ||
        response.data;

      setLastBill(bill);
      setMessage("Cash bill created successfully!");
      setCart([]);
      setDiscount(0);

      await fetchData();
      return;
    }

    // UPI / CARD — Razorpay payment
    const scriptLoaded = await loadRazorpayScript();

    if (!scriptLoaded) {
      throw new Error(
        "Unable to load Razorpay Checkout. Check your internet connection."
      );
    }

    // Create order through our backend
    const orderResponse = await API.post(
      "/payments/create-order",
      {
        items: cart.map((item) => ({
          product: item._id,
          quantity: item.quantity,
        })),
        discount: discountAmount,
      }
    );

    const { order, keyId } = orderResponse.data;

    if (!order?.id || !keyId) {
      throw new Error("Unable to create Razorpay payment order.");
    }

    const options = {
      key: keyId,
      amount: order.amount,
      currency: order.currency,
      name: "CRUDIFY",
      description: "Retail Store Payment",
      order_id: order.id,

      prefill: {
        name: user.name || "",
        email: user.email || "",
      },

      theme: {
        color: "#b08d57",
      },

      handler: async function (paymentResponse) {
        try {
          // Verify payment on the backend
          const verifyResponse = await API.post(
            "/payments/verify",
            paymentResponse
          );

          const bill =
            verifyResponse.data.bill ||
            verifyResponse.data.data;

          if (!bill) {
            throw new Error(
              "Payment was verified, but the bill was not returned."
            );
          }

          setLastBill(bill);
          setMessage("Razorpay payment successful! Bill created.");
          setCart([]);
          setDiscount(0);

          await fetchData();
        } catch (err) {
          setError(
            err.response?.data?.message ||
            err.message ||
            "Payment verification failed. Please contact the administrator before retrying."
          );
        } finally {
          setSaving(false);
        }
      },

      modal: {
        ondismiss: function () {
          setSaving(false);
          setMessage("");
        },
      },
    };

    const razorpay = new window.Razorpay(options);

    razorpay.on("payment.failed", function (response) {
      setError(
        response.error?.description ||
        "Payment failed. Please try again."
      );
      setSaving(false);
    });

    razorpay.open();

  } catch (err) {
    setError(
      err.response?.data?.message ||
      err.message ||
      "Billing failed. Please try again."
    );

    setSaving(false);
  }
};


  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount || 0);

  const printBill = () => {
    window.print();
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();

    try {
      setProfileSaving(true);
      setProfileMessage("");

      const formData = new FormData();
      formData.append("name", profileName);
      formData.append("email", profileEmail);

      if (selectedPhoto) {
        formData.append("image", selectedPhoto);
      }

      if (removePhoto) {
        formData.append("removeProfileImage", "true");
      }

      const response = await API.put("/auth/profile", formData);
      const updatedUser = response.data.user;

      setUser(updatedUser);
      localStorage.setItem(
        "crudifyUser",
        JSON.stringify(updatedUser)
      );

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

  return (
    <div className="billing-page">
      <div className="billing-header">
        <div>
          <span className="billing-eyebrow">
            CRUDIFY / POINT OF SALE
          </span>
          <h1>Billing Workspace</h1>
          <p>Create customer bills and manage sales.</p>
        </div>

        <div className="billing-profile-wrapper">
          <button
            className="billing-user billing-profile-trigger"
            onClick={() => setProfileMenuOpen((prev) => !prev)}
          >
            <div className="billing-profile-avatar">
              {user.profileImage ? (
                <img
                  src={getProfileImageUrl(user.profileImage)}
                  alt={user.name}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                user.name?.charAt(0)?.toUpperCase() || "U"
              )}
            </div>

            <div className="billing-profile-details">
              <span>Cashier</span>
              <strong>{user.name || "User"}</strong>
            </div>
          </button>

          {profileMenuOpen && (
            <div className="billing-profile-dropdown">
              <div className="billing-profile-dropdown-heading">
                <div className="billing-profile-avatar">
                  {user.profileImage ? (
                    <img
                      src={getProfileImageUrl(user.profileImage)}
                      alt={user.name}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    user.name?.charAt(0)?.toUpperCase() || "U"
                  )}
                </div>

                <div>
                  <strong>{user.name || "User"}</strong>
                  <span>{user.email || "Staff Account"}</span>
                </div>
              </div>

              <div className="billing-profile-divider" />

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
                className="billing-profile-logout"
                onClick={handleLogout}
              >
                <LogOut size={17} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {showProfile && (
        <div
          className="billing-profile-modal-overlay"
          onClick={() => {
            setShowProfile(false);
            setEditingProfile(false);
          }}
        >
          <div
            className="billing-profile-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="billing-profile-modal-close"
              onClick={() => {
                setShowProfile(false);
                setEditingProfile(false);
              }}
            >
              <X size={20} />
            </button>

            <form onSubmit={handleProfileSave}>
              <div className="billing-profile-photo-section">
                <div className="billing-profile-photo">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profile preview" />
                  ) : user.profileImage && !removePhoto ? (
                    <img
                      src={getProfileImageUrl(user.profileImage)}
                      alt="Staff profile"
                    />
                  ) : (
                    <span>
                      {user.name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  )}
                </div>

                {editingProfile && (
                  <div className="billing-photo-actions">
                    <label className="billing-change-photo">
                      <Camera size={15} />
                      Change Photo
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        hidden
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          if (file.size > 5 * 1024 * 1024) {
                            setProfileMessage(
                              "Image must be smaller than 5 MB."
                            );
                            e.target.value = "";
                            return;
                          }

                          setSelectedPhoto(file);
                          setPhotoPreview(
                            URL.createObjectURL(file)
                          );
                          setRemovePhoto(false);
                          setProfileMessage("");
                        }}
                      />
                    </label>

                    {(user.profileImage || selectedPhoto) && (
                      <button
                        type="button"
                        className="billing-remove-photo"
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
              </div>

              <h2>{user.name || "User"}</h2>

              <p className="billing-profile-role">
                {user.role || "Staff"}
              </p>

              {profileMessage && (
                <p className="billing-profile-message">
                  {profileMessage}
                </p>
              )}

              <div className="billing-profile-info">
                <span>Full Name</span>
                {editingProfile ? (
                  <input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                  />
                ) : (
                  <strong>{user.name || "—"}</strong>
                )}
              </div>

              <div className="billing-profile-info">
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

              <div className="billing-profile-info">
                <span>Account Role</span>
                <strong>{user.role || "Staff"}</strong>
              </div>

              <div className="billing-profile-edit-actions">
                {editingProfile ? (
                  <>
                    <button
                      type="button"
                      className="billing-profile-cancel"
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
                      className="billing-profile-save"
                      disabled={profileSaving}
                    >
                      {profileSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="billing-profile-save"
                    onClick={() => {
                      setProfileName(user.name || "");
                      setProfileEmail(user.email || "");
                      setEditingProfile(true);
                      setProfileMessage("");
                    }}
                  >
                    <UserRound size={16} />
                    Edit Profile
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {error && <div className="billing-alert error">{error}</div>}

      {message && (
        <div className="billing-alert success">{message}</div>
      )}

      {!isAdmin && (
        <nav className="billing-workspace-tabs">
          <button
            className={activeBillingTab === "sale" ? "active" : ""}
            onClick={() => setActiveBillingTab("sale")}
          >
            <ShoppingCart size={17} />
            New Sale
          </button>

          <button
            className={activeBillingTab === "history" ? "active" : ""}
            onClick={() => setActiveBillingTab("history")}
          >
            <Receipt size={17} />
            Bill History
          </button>

          <button
            className={activeBillingTab === "returns" ? "active" : ""}
            onClick={() => navigate("/staff/returns")}
          >
            <RefreshCw size={17} />
            Returns
          </button>
        </nav>
      )}

      {(isAdmin || activeBillingTab === "sale") && (
        <div className="billing-layout">
          <section className="billing-products">
            <div className="billing-section-heading">
              <div>
                <h2>Products</h2>
                <p>Select products to add to the bill.</p>
              </div>

              <button
                className="billing-refresh"
                onClick={fetchData}
                disabled={loading}
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>

            <div className="billing-search">
              <Search size={19} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by product, SKU, barcode..."
              />
            </div>

            {loading ? (
              <div className="billing-empty">Loading products...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="billing-empty">
                <Package size={35} />
                <strong>No products found</strong>
                <span>Add products in Product Management first.</span>
              </div>
            ) : (
              <div className="billing-product-grid">
                {filteredProducts.map((product) => (
                  <button
                    className="billing-product-card"
                    key={product._id}
                    onClick={() => addToCart(product)}
                    disabled={product.stock <= 0}
                  >
                    <div className="billing-product-icon">
                      {product.image ? (
                        <img
                          src={getProfileImageUrl(product.image)}
                          alt={product.name}
                        />
                      ) : (
                        <Package size={27} />
                      )}
                    </div>

                    <strong>{product.name}</strong>
                    <span>{product.sku}</span>
                    <b>{formatCurrency(product.price)}</b>

                    <small>
                      {product.stock > 0
                        ? `${product.stock} ${product.unit || "pcs"} available`
                        : "Out of stock"}
                    </small>

                    <div className="billing-add-label">
                      <Plus size={15} />
                      Add to cart
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="billing-cart">
            <div className="billing-cart-heading">
              <div>
                <ShoppingCart size={21} />
                <h2>Current Bill</h2>
              </div>
              <span>{cart.length} items</span>
            </div>

            {cart.length === 0 ? (
              <div className="billing-cart-empty">
                <ShoppingCart size={38} />
                <strong>Your cart is empty</strong>
                <span>Select products to start billing.</span>
              </div>
            ) : (
              <div className="billing-cart-items">
                {cart.map((item) => (
                  <div className="billing-cart-item" key={item._id}>
                    <div className="billing-item-info">
                      <strong>{item.name}</strong>
                      <span>{formatCurrency(item.price)} each</span>
                    </div>

                    <div className="billing-quantity">
                      <button
                        onClick={() => updateQuantity(item._id, -1)}
                      >
                        <Minus size={13} />
                      </button>

                      <span>{item.quantity}</span>

                      <button
                        onClick={() => updateQuantity(item._id, 1)}
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    <strong className="billing-item-total">
                      {formatCurrency(item.price * item.quantity)}
                    </strong>

                    <button
                      className="billing-remove"
                      onClick={() => removeItem(item._id)}
                      aria-label="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="billing-summary">
              <div className="billing-discount-field">
                <label>Discount amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>

              <div className="billing-summary-row">
                <span>Subtotal</span>
                <strong>{formatCurrency(subtotal)}</strong>
              </div>

              <div className="billing-summary-row">
                <span>Discount</span>
                <strong>- {formatCurrency(discountAmount)}</strong>
              </div>

              <div className="billing-summary-row">
                <span>Tax</span>
                <strong>{formatCurrency(taxAmount)}</strong>
              </div>

              <div className="billing-total">
                <span>Grand Total</span>
                <strong>{formatCurrency(grandTotal)}</strong>
              </div>

              <label className="billing-payment-label">
                Payment Method
              </label>

              <div className="billing-payment-options">
                {[
  { name: "Cash", icon: Banknote },
  { name: "Razorpay", icon: CreditCard },
].map((method) => {
                  const Icon = method.icon;

                  return (
                    <button
                      key={method.name}
                      className={
                        paymentMethod === method.name ? "selected" : ""
                      }
                      onClick={() => setPaymentMethod(method.name)}
                    >
                      <Icon size={17} />
                      {method.name}
                    </button>
                  );
                })}
              </div>

              <button
                className="billing-checkout"
                onClick={handleCheckout}
                disabled={!cart.length || saving}
              >
                <Receipt size={18} />
                {saving ? "Processing..." : "Complete Payment"}
              </button>

              <button
                className="billing-clear"
                onClick={clearCart}
                disabled={!cart.length}
              >
                <Trash2 size={15} />
                Clear Cart
              </button>
            </div>
          </section>
        </div>
      )}

      {!isAdmin && activeBillingTab === "history" && (
        <section className="billing-sales">
          <div className="billing-section-heading">
            <div>
              <h2>My Previous Bills</h2>
              <p>View your sales history and initiate customer returns.</p>
            </div>

            <span>{filteredSales.length} bills</span>
          </div>

          <div className="billing-history-filters">
            <div className="billing-search">
              <Search size={18} />
              <input
                value={billSearch}
                onChange={(e) => setBillSearch(e.target.value)}
                placeholder="Search invoice number..."
              />
            </div>

            <select
              value={billPaymentFilter}
              onChange={(e) => setBillPaymentFilter(e.target.value)}
            >
              <option value="All">All Payment Methods</option>
<option value="Cash">Cash</option>
<option value="Razorpay">Razorpay (Online)</option>
            </select>
          </div>

          {filteredSales.length === 0 ? (
            <div className="billing-empty">
              No previous bills found.
            </div>
          ) : (
            <div className="billing-table-wrap">
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>Invoice Number</th>
                    <th>Payment</th>
                    <th>Total</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSales.map((sale) => (
                    <tr key={sale._id}>
                      <td>{sale.billNumber}</td>
                      <td>
  {sale.paymentMethod === "Razorpay"
    ? `Razorpay (${sale.paymentGatewayMethod || "Online"})`
    : sale.paymentMethod}
</td>
                      <td>{formatCurrency(sale.grandTotal)}</td>
                      <td>
                        {new Date(sale.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td>{sale.paymentStatus}</td>
                      <td>
                        <button
                          className="billing-return-button"
                          disabled={
                            sale.paymentStatus === "Cancelled" ||
                            (sale.items || []).every(
                              (item) =>
                                (item.returnedQuantity || 0) >= item.quantity
                            )
                          }
                          onClick={() =>
                            navigate(
                              `/staff/returns?bill=${encodeURIComponent(
                                sale.billNumber
                              )}`
                            )
                          }
                        >
                          <RefreshCw size={15} />
                          Return
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {lastBill && (
        <div className="billing-success-panel">
          <div className="billing-success-heading">
            <CheckCircle size={22} />
            <strong>Payment completed successfully</strong>

            <button onClick={() => setLastBill(null)}>
              <X size={18} />
            </button>
          </div>

          <div className="billing-invoice" ref={invoiceRef}>
            <div className="invoice-brand">
              <div className="invoice-logo">C</div>
              <div>
                <h1>CRUDIFY</h1>
                <span>SMART RETAIL MANAGEMENT</span>
              </div>
            </div>

            <div className="invoice-title">
              <h2>TAX INVOICE</h2>
              <span>Original for Recipient</span>
            </div>

            <div className="invoice-store-details">
              <strong>CRUDIFY RETAIL STORE</strong>
              <p>Retail Store Address</p>
              <p>GSTIN: Add your GSTIN here</p>
              <p>Phone: Add your store contact number</p>
            </div>

            <div className="invoice-meta">
              <div>
                <span>Invoice Number</span>
                <strong>{lastBill.billNumber || lastBill._id}</strong>
              </div>

              <div>
                <span>Invoice Date</span>
                <strong>
                  {new Date(
                    lastBill.createdAt || Date.now()
                  ).toLocaleString("en-IN")}
                </strong>
              </div>

              <div>
                <span>Cashier</span>
                <strong>
                  {lastBill.createdBy?.name || user.name || "Staff"}
                </strong>
              </div>

              <div>
                <span>Payment Method</span>
                <strong>
  {lastBill.paymentMethod === "Razorpay"
    ? `Razorpay (${lastBill.paymentGatewayMethod || "Online"})`
    : lastBill.paymentMethod || paymentMethod}
</strong>
              </div>
            </div>

            <table className="invoice-items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                {(lastBill.items || []).map((item, index) => (
                  <tr key={item._id || index}>
                    <td>{index + 1}</td>
                    <td>
                      {item.productName || item.product?.name || "Product"}
                    </td>
                    <td>{item.sku || item.product?.sku || "-"}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.price)}</td>
                    <td>{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="invoice-totals">
              <div>
                <span>Subtotal</span>
                <strong>{formatCurrency(lastBill.subtotal)}</strong>
              </div>

              <div>
                <span>Discount</span>
                <strong>- {formatCurrency(lastBill.discount)}</strong>
              </div>

              <div>
                <span>GST / Tax</span>
                <strong>{formatCurrency(lastBill.taxAmount)}</strong>
              </div>

              <div className="invoice-grand-total">
                <span>Grand Total</span>
                <strong>{formatCurrency(lastBill.grandTotal)}</strong>
              </div>
            </div>

            <div className="invoice-payment-status">
              PAYMENT STATUS: {lastBill.paymentStatus || "Paid"}
            </div>

            <div className="invoice-footer">
              <strong>Thank you for shopping with us!</strong>
              <p>We appreciate your business.</p>
              <span>Powered by CRUDIFY Smart Retail Management</span>
            </div>
          </div>

          <button onClick={printBill}>
            <Printer size={17} />
            Print Invoice
          </button>
        </div>
      )}

      {isAdmin && (
        <section className="billing-sales">
          <div className="billing-section-heading">
            <div>
              <h2>Recent Sales</h2>
              <p>Overview of recorded bills.</p>
            </div>
            <span>{sales.length} bills</span>
          </div>

          {sales.length === 0 ? (
            <div className="billing-empty">
              No sales recorded yet.
            </div>
          ) : (
            <div className="billing-table-wrap">
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>Bill Number</th>
                    <th>Cashier</th>
                    <th>Payment</th>
                    <th>Total</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale._id}>
                      <td>{sale.billNumber || sale._id}</td>
                      <td>
                        <CashierInfo
                          name={sale.createdBy?.name || "Staff"}
                          image={sale.createdBy?.profileImage}
                        />
                      </td>
                      <td>
  {sale.paymentMethod === "Razorpay"
    ? `Razorpay (${sale.paymentGatewayMethod || "Online"})`
    : sale.paymentMethod || "Cash"}
</td>
                      <td>{formatCurrency(sale.grandTotal)}</td>
                      <td>
                        {sale.createdAt
                          ? new Date(sale.createdAt).toLocaleDateString("en-IN")
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default Billing;