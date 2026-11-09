
import { useEffect, useState } from "react";
import { API } from "../services/api";
import "./Purchases.css";

import {
  Plus,
  ShoppingBag,
  Search,
  Package,
  PackagePlus,
  ImagePlus,
  X,
} from "lucide-react";

const initialForm = {
  supplier: "",
  productType: "existing",
  product: "",
  newName: "",
  newSku: "",
  newCategory: "",
  sellingPrice: "",
  unit: "pcs",
  lowStockThreshold: 5,
  quantity: 1,
  costPrice: "",
  paymentStatus: "Unpaid",
  notes: "",
};

const initialSupplierForm = {
  name: "",
  companyName: "",
  email: "",
  phone: "",
  address: "",
  gstNumber: "",
};

function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supplierSaving, setSupplierSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState(initialForm);
  const [supplierForm, setSupplierForm] = useState(initialSupplierForm);

  const [productImage, setProductImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
const [updatingPurchase, setUpdatingPurchase] = useState(null);
  // Fetch purchases, suppliers and products
  const fetchData = async () => {
    try {
      setLoading(true);

      const [purchaseRes, supplierRes, productRes] =
        await Promise.all([
          API.get("/purchases"),
          API.get("/suppliers"),
          API.get("/products"),
        ]);

      setPurchases(purchaseRes.data.purchases || []);
      setSuppliers(supplierRes.data.suppliers || []);
      setProducts(productRes.data.products || []);

      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load purchase data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate purchase total
  const total =
    Number(form.quantity || 0) *
    Number(form.costPrice || 0);

  // Handle purchase form changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Change product type
  const handleProductType = (type) => {
    setForm((prev) => ({
      ...prev,
      productType: type,
      product: "",
      newName: "",
      newSku: "",
      newCategory: "",
      sellingPrice: "",
      costPrice: "",
      unit: "pcs",
      lowStockThreshold: 5,
    }));

    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setProductImage(null);
    setImagePreview("");
    setError("");
  };

  // Reset purchase form
  const resetForm = () => {
    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setForm(initialForm);
    setProductImage(null);
    setImagePreview("");
    setSupplierForm(initialSupplierForm);
    setShowSupplierForm(false);
    setShowForm(false);
  };

  // Handle product image upload
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, PNG and WEBP images are allowed.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be below 5MB.");
      e.target.value = "";
      return;
    }

    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setProductImage(file);
    setImagePreview(URL.createObjectURL(file));
    setError("");
  };

  // Remove product image
  const handleRemoveImage = () => {
    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setProductImage(null);
    setImagePreview("");
  };

  // Handle supplier form changes
  const handleSupplierChange = (e) => {
    const { name, value } = e.target;

    setSupplierForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Add a new supplier directly from Purchases
  const handleAddSupplier = async () => {
    if (
      !supplierForm.name.trim() ||
      !supplierForm.phone.trim()
    ) {
      setError(
        "Supplier name and phone number are required."
      );
      return;
    }

    try {
      setSupplierSaving(true);
      setError("");
      setMessage("");

      const supplierData = {
        name: supplierForm.name.trim(),
        companyName: supplierForm.companyName.trim(),
        email: supplierForm.email.trim(),
        phone: supplierForm.phone.trim(),
        address: supplierForm.address.trim(),
        gstNumber: supplierForm.gstNumber.trim(),
      };

      // Save supplier in MongoDB
      const createResponse = await API.post(
        "/suppliers",
        supplierData
      );

      // Fetch updated supplier list
      const response = await API.get("/suppliers");

      const updatedSuppliers =
        response.data.suppliers || [];

      setSuppliers(updatedSuppliers);

      // Use the created supplier ID if returned by the API
      const createdSupplier =
        createResponse.data.supplier;

      let newSupplier = createdSupplier?._id
        ? updatedSuppliers.find(
            (supplier) =>
              supplier._id === createdSupplier._id
          )
        : null;

      // Fallback: identify the new supplier by name and phone
      if (!newSupplier) {
        newSupplier = updatedSuppliers.find(
          (supplier) =>
            supplier.name?.toLowerCase() ===
              supplierData.name.toLowerCase() &&
            supplier.phone === supplierData.phone
        );
      }

      if (!newSupplier) {
        throw new Error(
          "Supplier was saved, but could not be selected. Please refresh the supplier list."
        );
      }

      // Automatically select the newly created supplier
      setForm((prev) => ({
        ...prev,
        supplier: newSupplier._id,
      }));

      setSupplierForm(initialSupplierForm);
      setShowSupplierForm(false);

      setMessage("Supplier added successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to add supplier."
      );
    } finally {
      setSupplierSaving(false);
    }
  };

  // Save purchase
  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (!form.supplier) {
        throw new Error("Please select a supplier.");
      }

      let purchaseItem;

      if (form.productType === "existing") {
        if (!form.product) {
          throw new Error("Please select a product.");
        }

        purchaseItem = {
          product: form.product,
          quantity: Number(form.quantity),
          costPrice: Number(form.costPrice),
        };
      } else {
        if (
          !form.newName.trim() ||
          !form.newSku.trim() ||
          !form.newCategory.trim() ||
          form.sellingPrice === ""
        ) {
          throw new Error(
            "Please fill in all required new product details."
          );
        }

        purchaseItem = {
          newProduct: {
            name: form.newName.trim(),
            sku: form.newSku.trim().toUpperCase(),
            category: form.newCategory.trim(),
            price: Number(form.sellingPrice),
            unit: form.unit,
            lowStockThreshold: Number(
              form.lowStockThreshold
            ),
          },
          quantity: Number(form.quantity),
          costPrice: Number(form.costPrice),
        };
      }

      // FormData supports product image upload
      const purchaseData = new FormData();

      purchaseData.append("supplier", form.supplier);

      purchaseData.append(
        "items",
        JSON.stringify([purchaseItem])
      );

      purchaseData.append(
        "paymentStatus",
        form.paymentStatus
      );

      purchaseData.append("notes", form.notes);

      if (
        form.productType === "new" &&
        productImage
      ) {
        purchaseData.append("image", productImage);
      }

      await API.post("/purchases", purchaseData);

      setMessage(
        form.productType === "new"
          ? "New product created and purchase recorded successfully."
          : "Purchase recorded and product stock updated."
      );

      resetForm();

      await fetchData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to record purchase."
      );
    } finally {
      setSaving(false);
    }
  };
  // Update purchase payment status
const handlePaymentStatusChange = async (purchaseId, paymentStatus) => {
  try {
    setUpdatingPurchase(purchaseId);
    setError("");
    setMessage("");

    const response = await API.patch(
      `/purchases/${purchaseId}/payment`,
      { paymentStatus }
    );

    const updatedPurchase = response.data.purchase;

    setPurchases((current) =>
      current.map((purchase) =>
        purchase._id === purchaseId
          ? updatedPurchase
          : purchase
      )
    );

    setMessage("Purchase payment status updated successfully.");
  } catch (err) {
    setError(
      err.response?.data?.message ||
      "Unable to update payment status."
    );
  } finally {
    setUpdatingPurchase(null);
  }
};

  // Filter purchase history by supplier
  const filteredPurchases = purchases.filter(
    (purchase) =>
      `${purchase.supplier?.name || ""} ${
        purchase.supplier?.companyName || ""
      }`
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  return (
    <div className="purchases-page">

      {/* Page heading */}
      <div className="purchases-heading">
        <div>
          <span className="purchases-eyebrow">
            INVENTORY MANAGEMENT
          </span>

          <h1>Purchases</h1>

          <p>
            Record supplier purchases and manage incoming stock.
          </p>
        </div>

        <button
          className="purchase-add-btn"
          onClick={() => {
            setShowForm(!showForm);
            setError("");
            setMessage("");
          }}
        >
          <Plus size={18} />
          New Purchase
        </button>
      </div>

      {error && (
        <div className="purchase-alert error">
          {error}
        </div>
      )}

      {message && (
        <div className="purchase-alert success">
          {message}
        </div>
      )}

      {/* Summary */}
      <div className="purchase-summary">
        <ShoppingBag size={24} />

        <div>
          <span>Total Purchase Records</span>
          <h2>{purchases.length}</h2>
        </div>
      </div>

      {/* Purchase form */}
      {showForm && (
        <form
          className="purchase-form"
          onSubmit={handleSubmit}
        >
          <h2>Record New Purchase</h2>

          <div className="purchase-form-grid">

            {/* Supplier section */}
            <div className="purchase-supplier-section">
              <div className="purchase-supplier-row">
                <label>
                  Supplier *

                  <select
                    name="supplier"
                    required
                    value={form.supplier}
                    onChange={handleChange}
                  >
                    <option value="">
                      Select supplier
                    </option>

                    {suppliers
                      .filter((s) => s.isActive)
                      .map((supplier) => (
                        <option
                          key={supplier._id}
                          value={supplier._id}
                        >
                          {supplier.name}
                          {supplier.companyName
                            ? ` - ${supplier.companyName}`
                            : ""}
                        </option>
                      ))}
                  </select>
                </label>

                <button
                  type="button"
                  className="purchase-add-supplier-btn"
                  onClick={() => {
                    setShowSupplierForm(
                      !showSupplierForm
                    );
                    setError("");
                  }}
                >
                  <Plus size={16} />
                  Add New Supplier
                </button>
              </div>

              {/* New supplier form */}
              {showSupplierForm && (
                <div className="purchase-new-supplier-card">

                  <div className="purchase-new-supplier-heading">
                    <div>
                      <h3>Add New Supplier</h3>
                      <p>
                        Enter the supplier's contact details.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setShowSupplierForm(false)
                      }
                      className="purchase-supplier-close"
                    >
                      <X size={19} />
                    </button>
                  </div>

                  <div className="purchase-supplier-grid">

                    <label>
                      Supplier Name *

                      <input
                        name="name"
                        value={supplierForm.name}
                        onChange={handleSupplierChange}
                        placeholder="Enter supplier name"
                        required
                      />
                    </label>

                    <label>
                      Company Name

                      <input
                        name="companyName"
                        value={supplierForm.companyName}
                        onChange={handleSupplierChange}
                        placeholder="Enter company name"
                      />
                    </label>

                    <label>
                      Email

                      <input
                        type="email"
                        name="email"
                        value={supplierForm.email}
                        onChange={handleSupplierChange}
                        placeholder="supplier@example.com"
                      />
                    </label>

                    <label>
                      Phone *

                      <input
                        name="phone"
                        value={supplierForm.phone}
                        onChange={handleSupplierChange}
                        placeholder="Enter phone number"
                        required
                      />
                    </label>

                    <label>
                      GST Number

                      <input
                        name="gstNumber"
                        value={supplierForm.gstNumber}
                        onChange={handleSupplierChange}
                        placeholder="Optional GST number"
                      />
                    </label>

                    <label>
                      Address

                      <input
                        name="address"
                        value={supplierForm.address}
                        onChange={handleSupplierChange}
                        placeholder="Enter supplier address"
                      />
                    </label>

                  </div>

                  <div className="purchase-supplier-actions">
                    <button
                      type="button"
                      className="purchase-supplier-cancel"
                      onClick={() => {
                        setShowSupplierForm(false);
                        setSupplierForm(
                          initialSupplierForm
                        );
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="purchase-supplier-save"
                      onClick={handleAddSupplier}
                      disabled={supplierSaving}
                    >
                      {supplierSaving
                        ? "Saving..."
                        : "Save Supplier"}
                    </button>
                  </div>

                </div>
              )}
            </div>

            {/* Product type selector */}
            <div className="purchase-full-width">
              <label>Product Type *</label>

              <div className="purchase-type-selector">

                <button
                  type="button"
                  className={`purchase-type-btn ${
                    form.productType === "existing"
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    handleProductType("existing")
                  }
                >
                  <Package size={19} />

                  <span>
                    <strong>Existing Product</strong>
                    <small>
                      Select from inventory
                    </small>
                  </span>
                </button>

                <button
                  type="button"
                  className={`purchase-type-btn ${
                    form.productType === "new"
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    handleProductType("new")
                  }
                >
                  <PackagePlus size={19} />

                  <span>
                    <strong>New Product</strong>
                    <small>
                      Create while purchasing
                    </small>
                  </span>
                </button>

              </div>
            </div>

            {/* Existing product fields */}
            {form.productType === "existing" && (
              <label className="purchase-full-width">
                Select Product *

                <select
                  name="product"
                  required
                  value={form.product}
                  onChange={(e) => {
                    const selected = products.find(
                      (p) => p._id === e.target.value
                    );

                    setForm((prev) => ({
                      ...prev,
                      product: e.target.value,
                      costPrice:
                        selected?.costPrice ?? "",
                    }));
                  }}
                >
                  <option value="">
                    Select product
                  </option>

                  {products
                    .filter((p) => p.isActive)
                    .map((product) => (
                      <option
                        key={product._id}
                        value={product._id}
                      >
                        {product.name} ({product.sku})
                        {" "} - Stock: {product.stock}
                      </option>
                    ))}
                </select>
              </label>
            )}

            {/* New product fields */}
            {form.productType === "new" && (
              <>
                <div className="purchase-full-width">
                  <div className="purchase-new-product-heading">
                    <PackagePlus size={19} />

                    <div>
                      <strong>New Product Details</strong>

                      <small>
                        This product will automatically be
                        added to your inventory.
                      </small>
                    </div>
                  </div>
                </div>

                <label>
                  Product Name *

                  <input
                    name="newName"
                    value={form.newName}
                    onChange={handleChange}
                    placeholder="e.g. Floral Cotton Kurti"
                    required
                  />
                </label>

                <label>
                  SKU / Product Code *

                  <input
                    name="newSku"
                    value={form.newSku}
                    onChange={handleChange}
                    placeholder="e.g. DRS001"
                    required
                  />
                </label>

                <label>
                  Category *

                  <input
                    name="newCategory"
                    value={form.newCategory}
                    onChange={handleChange}
                    placeholder="e.g. Women's Wear"
                    required
                  />
                </label>

                {/* Product image */}
                <div className="purchase-full-width">
                  <label>Product Image</label>

                  <div className="purchase-image-upload">
                    <label className="purchase-image-box">

                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Product preview"
                        />
                      ) : (
                        <>
                          <ImagePlus size={28} />

                          <strong>
                            Upload Product Image
                          </strong>

                          <small>
                            JPG, PNG or WEBP · Maximum 5MB
                          </small>
                        </>
                      )}

                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageChange}
                        hidden
                      />

                    </label>

                    {imagePreview && (
                      <button
                        type="button"
                        className="purchase-remove-image"
                        onClick={handleRemoveImage}
                      >
                        Remove Image
                      </button>
                    )}
                  </div>
                </div>

                <label>
                  Selling Price (₹) *

                  <input
                    type="number"
                    name="sellingPrice"
                    min="0"
                    step="0.01"
                    value={form.sellingPrice}
                    onChange={handleChange}
                    placeholder="Enter selling price"
                    required
                  />
                </label>

                <label>
                  Unit

                  <select
                    name="unit"
                    value={form.unit}
                    onChange={handleChange}
                  >
                    <option value="pcs">Pieces</option>
                    <option value="kg">Kilogram</option>
                    <option value="g">Gram</option>
                    <option value="litre">Litre</option>
                    <option value="ml">Millilitre</option>
                    <option value="box">Box</option>
                    <option value="packet">Packet</option>
                    <option value="dozen">Dozen</option>
                  </select>
                </label>

                <label>
                  Low Stock Alert Quantity

                  <input
                    type="number"
                    name="lowStockThreshold"
                    min="0"
                    value={form.lowStockThreshold}
                    onChange={handleChange}
                  />
                </label>
              </>
            )}

            {/* Common purchase fields */}
            <label>
              Purchase Quantity *

              <input
                type="number"
                name="quantity"
                min="1"
                step="1"
                required
                value={form.quantity}
                onChange={handleChange}
              />
            </label>

            <label>
              Purchase Price per Unit (₹) *

              <input
                type="number"
                name="costPrice"
                min="0"
                step="0.01"
                required
                value={form.costPrice}
                onChange={handleChange}
                placeholder="Enter purchase price"
              />
            </label>

            <label>
              Payment Status

              <select
                name="paymentStatus"
                value={form.paymentStatus}
                onChange={handleChange}
              >
                <option value="Unpaid">Unpaid</option>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
              </select>
            </label>

            <label>
              Total Amount

              <input
                value={`₹${total.toFixed(2)}`}
                readOnly
              />
            </label>

            <label className="purchase-full-width">
              Notes

              <textarea
                name="notes"
                rows="2"
                value={form.notes}
                onChange={handleChange}
                placeholder="Optional purchase notes"
              />
            </label>

          </div>

          {/* Form actions */}
          <div className="purchase-form-actions">

            <button
              type="button"
              className="purchase-cancel-btn"
              onClick={resetForm}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="purchase-save-btn"
              disabled={saving || supplierSaving}
            >
              {saving ? "Saving..." : "Save Purchase"}
            </button>

          </div>
        </form>
      )}

      {/* Purchase history */}
      <div className="purchase-table-card">

        <div className="purchase-table-heading">
          <div>
            <h2>Purchase History</h2>
            <p>All recorded supplier purchases</p>
          </div>

          <div className="purchase-search">
            <Search size={17} />

            <input
              placeholder="Search supplier..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />
          </div>
        </div>

        {loading ? (
          <p className="purchase-empty">
            Loading purchases...
          </p>
        ) : filteredPurchases.length === 0 ? (
          <p className="purchase-empty">
            No purchases recorded yet.
          </p>
        ) : (
          <div className="purchase-table-wrap">
            <table className="purchase-table">

              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Products</th>
                  <th>Quantity</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase._id}>

                    <td>
                      <strong>
                        {purchase.supplier?.name ||
                          "Unknown"}
                      </strong>
                    </td>

                    <td>
                      {purchase.items
                        ?.map(
                          (item) =>
                            item.product?.name || "Product"
                        )
                        .join(", ")}
                    </td>

                    <td>
                      {purchase.items?.reduce(
                        (sum, item) =>
                          sum + item.quantity,
                        0
                      )}
                    </td>

                    <td>
                      ₹
                      {Number(
                        purchase.grandTotal || 0
                      ).toFixed(2)}
                    </td>

                   <td>
  <select
    className={`purchase-status-select ${
      purchase.paymentStatus?.toLowerCase()
    }`}
    value={purchase.paymentStatus || "Unpaid"}
    disabled={updatingPurchase === purchase._id}
    onChange={(e) =>
      handlePaymentStatusChange(
        purchase._id,
        e.target.value
      )
    }
  >
    <option value="Paid">Paid</option>
    <option value="Unpaid">Unpaid</option>
    <option value="Partial">Partial</option>
  </select>

  {updatingPurchase === purchase._id && (
    <small>Updating...</small>
  )}
</td>

                    <td>
                      {new Date(
                        purchase.purchaseDate
                      ).toLocaleDateString("en-IN")}
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}

      </div>
    </div>
  );
}

export default Purchases;
