
import { useEffect, useState } from "react";
import { Plus, Search, Pencil, Trash2, X, Truck } from "lucide-react";
import { API } from "../services/api";
import "./Suppliers.css";

const emptyForm = {
  name: "",
  companyName: "",
  email: "",
  phone: "",
  address: "",
  gstNumber: "",
  notes: "",
};

function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await API.get("/suppliers");
      setSuppliers(response.data.suppliers || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load suppliers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editingId) {
        await API.put(`/suppliers/${editingId}`, form);
        setMessage("Supplier updated successfully.");
      } else {
        await API.post("/suppliers", form);
        setMessage("Supplier added successfully.");
      }

      resetForm();
      await fetchSuppliers();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save supplier.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (supplier) => {
    setForm({
      name: supplier.name || "",
      companyName: supplier.companyName || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      gstNumber: supplier.gstNumber || "",
      notes: supplier.notes || "",
    });
    setEditingId(supplier._id);
    setShowForm(true);
    setError("");
    setMessage("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this supplier?")) return;

    try {
      await API.delete(`/suppliers/${id}`);
      setMessage("Supplier deleted successfully.");
      await fetchSuppliers();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete supplier.");
    }
  };

  const filteredSuppliers = suppliers.filter((supplier) => {
    const term = search.toLowerCase();
    return (
      supplier.name?.toLowerCase().includes(term) ||
      supplier.companyName?.toLowerCase().includes(term) ||
      supplier.phone?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="suppliers-page">
      <div className="suppliers-heading">
        <div>
          <span className="suppliers-eyebrow">INVENTORY MANAGEMENT</span>
          <h1>Suppliers</h1>
          <p>Manage your supplier relationships and contact details.</p>
        </div>

        <button
          className="supplier-add-btn"
          onClick={() => {
            resetForm();
            setShowForm(true);
            setError("");
          }}
        >
          <Plus size={18} /> Add Supplier
        </button>
      </div>

      {message && <div className="supplier-alert success">{message}</div>}
      {error && <div className="supplier-alert error">{error}</div>}

      <div className="supplier-summary">
        <div className="supplier-summary-icon"><Truck size={22} /></div>
        <div>
          <span>Total Suppliers</span>
          <h2>{suppliers.length}</h2>
        </div>
      </div>

      {showForm && (
        <div className="supplier-form-card">
          <div className="supplier-form-heading">
            <h2>{editingId ? "Edit Supplier" : "Add New Supplier"}</h2>
            <button type="button" onClick={resetForm} className="supplier-close">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="supplier-form-grid">
              <label>
                Supplier Name *
                <input name="name" value={form.name} onChange={handleChange} required placeholder="Enter supplier name" />
              </label>

              <label>
                Company Name
                <input name="companyName" value={form.companyName} onChange={handleChange} placeholder="Company name" />
              </label>

              <label>
                Phone Number *
                <input name="phone" value={form.phone} onChange={handleChange} required placeholder="Phone number" />
              </label>

              <label>
                Email Address
                <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="supplier@example.com" />
              </label>

              <label>
                GST Number
                <input name="gstNumber" value={form.gstNumber} onChange={handleChange} placeholder="GSTIN (optional)" />
              </label>

              <label>
                Address
                <input name="address" value={form.address} onChange={handleChange} placeholder="Supplier address" />
              </label>

              <label className="supplier-full-width">
                Notes
                <textarea name="notes" value={form.notes} onChange={handleChange} rows="3" placeholder="Additional information..." />
              </label>
            </div>

            <div className="supplier-form-actions">
              <button type="button" className="supplier-cancel-btn" onClick={resetForm}>Cancel</button>
              <button type="submit" className="supplier-save-btn" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update Supplier" : "Save Supplier"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="supplier-table-card">
        <div className="supplier-table-heading">
          <div>
            <h2>Supplier Directory</h2>
            <p>{filteredSuppliers.length} suppliers found</p>
          </div>

          <div className="supplier-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search suppliers..."
            />
          </div>
        </div>

        {loading ? (
          <p className="supplier-empty">Loading suppliers...</p>
        ) : filteredSuppliers.length === 0 ? (
          <p className="supplier-empty">No suppliers found. Add your first supplier.</p>
        ) : (
          <div className="supplier-table-wrap">
            <table className="supplier-table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>GST Number</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier._id}>
                    <td><strong>{supplier.name}</strong></td>
                    <td>{supplier.companyName || "—"}</td>
                    <td>{supplier.phone}</td>
                    <td>{supplier.email || "—"}</td>
                    <td>{supplier.gstNumber || "—"}</td>
                    <td>
                      <div className="supplier-actions">
                        <button onClick={() => handleEdit(supplier)} title="Edit"><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(supplier._id)} title="Delete" className="delete"><Trash2 size={16} /></button>
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

export default Suppliers;
