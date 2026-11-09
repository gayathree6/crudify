
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Store, ShieldCheck } from "lucide-react";
import API from "../services/api";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.email.trim() || !formData.password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await API.post("/auth/login", {
        email: formData.email.trim(),
        password: formData.password,
      });

      const { token, user } = response.data;

      if (!token || !user) {
        setError("Invalid server response. Please try again.");
        return;
      }

      const role = user.role?.toLowerCase();

      if (role !== "admin" && role !== "staff") {
        setError("Your account does not have an authorized role.");
        return;
      }

      // Save authenticated user details
      localStorage.setItem("crudifyToken", token);
      localStorage.setItem("crudifyUser", JSON.stringify(user));

      // Redirect according to user role
      if (role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (role === "staff") {
        navigate("/staff/billing", { replace: true });
      }

    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to connect to server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* LEFT SIDE */}
      <div className="login-left">

        <div className="brand">
          <div className="brand-icon">
            <Store size={25} />
          </div>
          <span>CRUDIFY</span>
        </div>

        <div className="welcome-content">

          <span className="welcome-tag">
            SMART RETAIL MANAGEMENT
          </span>

          <h1>
            Manage your store.
            <br />
            Grow your business.
          </h1>

          <p>
            One powerful platform to manage products, billing,
            inventory, staff and business performance.
          </p>

          <div className="feature-line">
            <ShieldCheck size={20} />
            <span>Secure role-based access</span>
          </div>

        </div>

        <div className="left-footer">
          © 2026 CRUDIFY. All rights reserved.
        </div>

      </div>

      {/* RIGHT SIDE */}
      <div className="login-right">

        <div className="login-card">

          <div className="mobile-brand">
            CRUDIFY
          </div>

          <div className="login-heading">

            <span>WORKSPACE LOGIN</span>

            <h2>Welcome back!</h2>

            <p>
              Sign in to access your designated workspace.
            </p>

          </div>

          <form onSubmit={handleSubmit}>

            <div className="form-group-custom">

              <label htmlFor="email">
                Email address
              </label>

              <input
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="username"
                required
              />

            </div>

            <div className="form-group-custom">

              <label htmlFor="password">
                Password
              </label>

              <div className="password-field">

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword
                    ? <EyeOff size={19} />
                    : <Eye size={19} />
                  }
                </button>

              </div>

            </div>

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In to CRUDIFY"}
            </button>

          </form>

          <div className="login-security">
            <ShieldCheck size={17} />
            <span>
              Your account is protected with secure authentication.
            </span>
          </div>

          <div className="login-role-note">
            Admin and authorized billing staff can use this login.
          </div>

        </div>

      </div>

    </div>
  );
}

export default Login;
