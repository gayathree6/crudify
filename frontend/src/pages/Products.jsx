
import { useEffect, useState } from "react";
import { API } from "../services/api";
import {
  Plus, Search, Package, Pencil, Trash2,
  RefreshCw, X, ImagePlus
} from "lucide-react";
import "./Products.css";

const initialForm = {
  name: "",
  sku: "",
  category: "",
  description: "",
  price: "",
  costPrice: "",
  stock: "",
  lowStockThreshold: "5",
  unit: "piece",
  barcode: ""
};

function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await API.get("/products");
      setProducts(response.data.products || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const categories = [
    "All",
    ...new Set(products.map((product) => product.category))
  ];

  const filteredProducts = products.filter((product) => {
    const matchesSearch = [
      product.name, product.sku, product.category, product.barcode
    ].some((value) =>
      String(value || "").toLowerCase().includes(search.toLowerCase())
    );

    return matchesSearch &&
      (categoryFilter === "All" || product.category === categoryFilter);
  });

  const lowStockCount = products.filter(
    (product) => product.stock <= product.lowStockThreshold
  ).length;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Please select a JPG, PNG or WEBP image.");
      e.target.value = "";
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5 MB.");
      e.target.value = "";
      return;
    }

    setImage(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setError("");
  };

  const resetForm = () => {
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setForm(initialForm);
    setImage(null);
    setPreview("");
    setEditingId(null);
    setShowForm(false);
  };

 
const handleSubmit = async (e) => {
  e.preventDefault();
  setSaving(true);
  setError("");
  setMessage("");

  try {
    const data = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      data.append(key, value);
    });

    if (image) {
      data.append("image", image);
    }

    // Let Axios/browser set the multipart boundary automatically
    if (editingId) {
      await API.put(`/products/${editingId}`, data);
      setMessage("Product updated successfully.");
    } else {
      await API.post("/products", data);
      setMessage("Product added successfully.");
    }

    resetForm();
    await fetchProducts();

  } catch (err) {
    console.error("PRODUCT SAVE ERROR:", err.response?.data || err);

    setError(
      err.response?.data?.message ||
      err.message ||
      "Unable to save product."
    );
  } finally {
    setSaving(false);
  }
};


  const handleEdit = (product) => {
    setEditingId(product._id);

    setForm({
      name: product.name || "",
      sku: product.sku || "",
      category: product.category || "",
      description: product.description || "",
      price: String(product.price ?? ""),
      costPrice: String(product.costPrice ?? 0),
      stock: String(product.stock ?? 0),
      lowStockThreshold: String(product.lowStockThreshold ?? 5),
      unit: product.unit || "piece",
      barcode: product.barcode || ""
    });

    setImage(null);
    setPreview(product.image
      ? `https://crudify-backend-qvx1.onrender.com${product.image}`
      : "");
    setShowForm(true);
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      await API.delete(`/products/${id}`);
      setMessage("Product deleted successfully.");
      setError("");
      await fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete product.");
    }
  };

  return (
    <div className="products-page">
      <div className="products-heading">
        <div>
          <span className="products-eyebrow">INVENTORY MANAGEMENT</span>
          <h1>Products</h1>
          <p>Manage products, images, prices and available stock.</p>
        </div>

        <button className="add-product-button" onClick={() => {
          resetForm();
          setShowForm(true);
        }}>
          <Plus size={18} /> Add Product
        </button>
      </div>

      {message && <div className="product-alert success">{message}</div>}
      {error && <div className="product-alert error">{error}</div>}

      <div className="product-stat-grid">
        <div className="product-stat-card">
          <div className="product-stat-icon"><Package size={20} /></div>
          <div><span>Total Products</span><strong>{products.length}</strong></div>
        </div>

        <div className="product-stat-card">
          <div className="product-stat-icon warning"><Package size={20} /></div>
          <div><span>Low Stock Items</span><strong>{lowStockCount}</strong></div>
        </div>

        <div className="product-stat-card">
          <div className="product-stat-icon"><Package size={20} /></div>
          <div>
            <span>Total Stock Units</span>
            <strong>{products.reduce((total, p) => total + p.stock, 0)}</strong>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="product-form-card">
          <div className="product-form-heading">
            <div>
              <h2>{editingId ? "Edit Product" : "Add New Product"}</h2>
              <p>Enter product details and upload a product picture.</p>
            </div>
            <button className="product-close-button" onClick={resetForm}>
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="product-image-upload">
              <label>Product Picture</label>

              <label className="product-image-dropzone">
                {preview ? (
                  <img src={preview} alt="Product preview" />
                ) : (
                  <>
                    <ImagePlus size={35} />
                    <strong>Upload Product Image</strong>
                    <span>JPG, PNG or WEBP · Maximum 5 MB</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  hidden
                />
              </label>

              {preview && (
                <button
                  type="button"
                  className="remove-product-image"
                  onClick={() => {
                    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
                    setImage(null);
                    setPreview("");
                  }}
                >
                  Remove / Clear preview
                </button>
              )}
            </div>

            <div className="product-form-grid">
              <div className="product-field">
                <label>Product Name *</label>
                <input name="name" value={form.name} onChange={handleChange} required placeholder="Enter product name" />
              </div>

              <div className="product-field">
                <label>SKU *</label>
                <input name="sku" value={form.sku} onChange={handleChange} required placeholder="Example: PRD001" />
              </div>

              <div className="product-field">
                <label>Category *</label>
                <input name="category" value={form.category} onChange={handleChange} required placeholder="Electronics, Clothing, Grocery" />
              </div>

              <div className="product-field">
                <label>Barcode</label>
                <input name="barcode" value={form.barcode} onChange={handleChange} placeholder="Optional barcode" />
              </div>

              <div className="product-field">
                <label>Selling Price (₹) *</label>
                <input type="number" name="price" value={form.price} onChange={handleChange} min="0" step="0.01" required />
              </div>

              <div className="product-field">
                <label>Cost Price (₹)</label>
                <input type="number" name="costPrice" value={form.costPrice} onChange={handleChange} min="0" step="0.01" />
              </div>

              <div className="product-field">
                <label>Available Stock *</label>
                <input type="number" name="stock" value={form.stock} onChange={handleChange} min="0" required />
              </div>

              <div className="product-field">
                <label>Low Stock Alert At</label>
                <input type="number" name="lowStockThreshold" value={form.lowStockThreshold} onChange={handleChange} min="0" />
              </div>

              <div className="product-field">
                <label>Unit</label>
                <select name="unit" value={form.unit} onChange={handleChange}>
                  <option value="piece">Piece</option>
                  <option value="kg">Kilogram</option>
                  <option value="gram">Gram</option>
                  <option value="litre">Litre</option>
                  <option value="metre">Metre</option>
                  <option value="pack">Pack</option>
                  <option value="box">Box</option>
                  <option value="pair">Pair</option>
                </select>
              </div>

              <div className="product-field full-width">
                <label>Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows="3" placeholder="Additional product details" />
              </div>
            </div>

            <div className="product-form-actions">
              <button type="button" className="product-cancel-button" onClick={resetForm}>
                Cancel
              </button>
              <button type="submit" className="product-save-button" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update Product" : "Save Product"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="products-table-card">
        <div className="products-table-heading">
          <div>
            <h2>Product Inventory</h2>
            <p>{filteredProducts.length} products found</p>
          </div>
          <button className="product-refresh" onClick={fetchProducts}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        <div className="product-filters">
          <div className="product-search">
            <Search size={17} />
            <input
              placeholder="Search by name, SKU or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="products-empty">Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <div className="products-empty">
            <Package size={35} />
            <p>No products found. Add your first product.</p>
          </div>
        ) : (
          <div className="products-table-wrapper">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product._id}>
                    <td>
                      {product.image ? (
                        <img
                          className="product-table-image"
                          src={`https://crudify-backend-qvx1.onrender.com${product.image}`}
                          alt={product.name}
                        />
                      ) : (
                        <div className="product-image-placeholder">
                          <Package size={19} />
                        </div>
                      )}
                    </td>
                    <td><strong>{product.name}</strong><small>{product.unit}</small></td>
                    <td>{product.sku}</td>
                    <td>{product.category}</td>
                    <td>₹{Number(product.price).toFixed(2)}</td>
                    <td>{product.stock}</td>
                    <td>
                      <span className={
                        product.stock <= product.lowStockThreshold
                          ? "product-stock low"
                          : "product-stock available"
                      }>
                        {product.stock <= product.lowStockThreshold ? "Low Stock" : "Available"}
                      </span>
                    </td>
                    <td>
                      <div className="product-row-actions">
                        <button title="Edit" onClick={() => handleEdit(product)}>
                          <Pencil size={15} />
                        </button>
                        <button title="Delete" className="delete" onClick={() => handleDelete(product._id)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
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

export default Products;
