
import { useCallback, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import Preloader from "./components/Preloader";
import AdminLayout from "./components/AdminLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Staff from "./pages/Staff";
import Products from "./pages/Products";
import Suppliers from "./pages/Suppliers";
import Purchases from "./pages/Purchases";
import Billing from "./pages/Billing";
import Transactions from "./pages/Transactions";
import Returns from "./pages/Returns";
import Notifications from "./pages/Notifications";
import Reports from "./pages/Reports";

function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem("crudifyToken");

  let user = {};

  try {
    user = JSON.parse(localStorage.getItem("crudifyUser") || "{}");
  } catch {
    user = {};
  }

  const role = user.role?.toLowerCase();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role !== allowedRole) {
    if (role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }

    if (role === "staff") {
      return <Navigate to="/staff/billing" replace />;
    }

    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  const [loading, setLoading] = useState(true);

  const handlePreloaderComplete = useCallback(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return <Preloader onComplete={handlePreloaderComplete} />;
  }

  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />

      {/* Admin Portal */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="staff" element={<Staff />} />
        <Route path="products" element={<Products />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="returns" element={<Returns />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="reports" element={<Reports />} />
      </Route>

      {/* Staff Portal */}
      <Route
        path="/staff/billing"
        element={
          <ProtectedRoute allowedRole="staff">
            <Billing />
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff/returns"
        element={
          <ProtectedRoute allowedRole="staff">
            <Returns />
          </ProtectedRoute>
        }
      />

      {/* Unknown URLs */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
