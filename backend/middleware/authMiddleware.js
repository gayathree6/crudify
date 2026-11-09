
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// VERIFY LOGIN TOKEN
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Please login."
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Server authentication configuration error"
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User not found or account is inactive"
      });
    }

    req.user = user;

    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};

// ADMIN-ONLY ACCESS
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Access denied. Admin permission required."
  });
};

// STAFF-ONLY ACCESS
const staffOnly = (req, res, next) => {
  if (req.user && req.user.role === "staff") {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Access denied. Staff permission required."
  });
};

module.exports = {
  protect,
  adminOnly,
  staffOnly
};
