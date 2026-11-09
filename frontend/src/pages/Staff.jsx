
import { useEffect, useState } from "react";
import { API } from "../services/api";
import "./Staff.css";

const getProfileImageUrl = (image) => {
  if (!image) return "";
  if (image.startsWith("http")) return image;
  return `https://crudify-backend-qvx1.onrender.com${image}`;
};

function Staff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await API.get("/staff");
      setStaff(response.data.staff || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load staff.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setForm({ name: "", email: "", password: "" });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      if (editingId) {
        await API.put(`/staff/${editingId}`, {
          name: form.name,
          email: form.email
        });
        setMessage("Staff details updated successfully.");
      } else {
        await API.post("/auth/staff", form);
        setMessage("Staff account created successfully.");
      }

      resetForm();
      await fetchStaff();
    } catch (err) {
      setError(err.response?.data?.message || "Operation failed.");
    }
  };

  const handleEdit = (person) => {
    setEditingId(person._id || person.id);
    setForm({
      name: person.name,
      email: person.email,
      password: ""
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStatus = async (id) => {
    try {
      await API.patch(`/staff/${id}/status`);
      setMessage("Staff status updated.");
      await fetchStaff();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update status.");
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this staff account?"
    );

    if (!confirmed) return;

    try {
      await API.delete(`/staff/${id}`);
      setMessage("Staff account deleted.");
      await fetchStaff();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete staff.");
    }
  };

  return (
    <div className="staff-page">
      <div className="staff-heading">
        <div>
          <span className="staff-eyebrow">ADMINISTRATION</span>
          <h1>Staff Management</h1>
          <p>Manage your employees and their workspace access.</p>
        </div>

        <div className="staff-total">
          <span>Total Staff</span>
          <strong>{staff.length}</strong>
        </div>
      </div>

      {message && <div className="staff-alert success">{message}</div>}
      {error && <div className="staff-alert error">{error}</div>}

      <div className="staff-content">
        <section className="staff-form-card">
          <h2>{editingId ? "Edit Staff Member" : "Add New Staff"}</h2>
          <p className="staff-card-description">
            {editingId
              ? "Update employee information."
              : "Create an account for an authorized employee."}
          </p>

          <form onSubmit={handleSubmit}>
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              placeholder="Enter full name"
              value={form.name}
              onChange={handleChange}
              required
            />

            <label>Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="Enter email address"
              value={form.email}
              onChange={handleChange}
              required
            />

            {!editingId && (
              <>
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Minimum 8 characters"
                  value={form.password}
                  onChange={handleChange}
                  minLength={8}
                  required
                />
              </>
            )}

            <button className="staff-submit" type="submit">
              {editingId ? "Save Changes" : "Create Staff Account"}
            </button>

            {editingId && (
              <button
                className="staff-cancel"
                type="button"
                onClick={resetForm}
              >
                Cancel Editing
              </button>
            )}
          </form>
        </section>

        <section className="staff-list-card">
          <div className="staff-list-heading">
            <div>
              <h2>Employee Directory</h2>
              <p>All registered staff accounts</p>
            </div>

            <button onClick={fetchStaff} className="staff-refresh">
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="staff-empty">Loading staff members...</p>
          ) : staff.length === 0 ? (
            <p className="staff-empty">
              No staff accounts found. Add your first employee.
            </p>
          ) : (
            <div className="staff-table-wrapper">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {staff.map((person) => {
                    const id = person._id || person.id;
                    const imageUrl = getProfileImageUrl(person.profileImage);

                    return (
                      <tr key={id}>
                        <td>
                          <div className="staff-person">
                            <div className="staff-avatar">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={`${person.name}'s profile`}
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                person.name?.charAt(0).toUpperCase()
                              )}
                              {imageUrl && (
                                <span className="staff-avatar-fallback">
                                  {person.name?.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>

                            <strong>{person.name}</strong>
                          </div>
                        </td>

                        <td>{person.email}</td>

                        <td>
                          <span
                            className={
                              person.isActive
                                ? "staff-status active"
                                : "staff-status inactive"
                            }
                          >
                            {person.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td>
                          <div className="staff-actions">
                            <button onClick={() => handleEdit(person)}>
                              Edit
                            </button>

                            <button onClick={() => handleStatus(id)}>
                              {person.isActive ? "Deactivate" : "Activate"}
                            </button>

                            <button
                              className="delete-action"
                              onClick={() => handleDelete(id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Staff;
