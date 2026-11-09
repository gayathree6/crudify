
const User = require("../models/User");
const mongoose = require("mongoose");

// GET ALL STAFF
const getAllStaff = async (req, res) => {
  try {
    const staff = await User.find({ role: "staff" })
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: staff.length,
      staff
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to fetch staff"
    });
  }
};

// UPDATE STAFF DETAILS
const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff ID"
      });
    }

    const staff = await User.findOne({ _id: id, role: "staff" });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found"
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty"
        });
      }
      staff.name = name.trim();
    }

    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) {
        return res.status(400).json({
          success: false,
          message: "Email cannot be empty"
        });
      }

      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: id }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email already exists"
        });
      }

      staff.email = normalizedEmail;
    }

    await staff.save();

    res.status(200).json({
      success: true,
      message: "Staff updated successfully",
      staff: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        isActive: staff.isActive
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to update staff"
    });
  }
};

// ACTIVATE OR DEACTIVATE STAFF
const toggleStaffStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff ID"
      });
    }

    const staff = await User.findOne({ _id: id, role: "staff" });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found"
      });
    }

    staff.isActive = !staff.isActive;
    await staff.save();

    res.status(200).json({
      success: true,
      message: staff.isActive
        ? "Staff account activated"
        : "Staff account deactivated",
      isActive: staff.isActive
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to update staff status"
    });
  }
};

// DELETE STAFF
const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff ID"
      });
    }

    const staff = await User.findOneAndDelete({
      _id: id,
      role: "staff"
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Staff deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to delete staff"
    });
  }
};

module.exports = {
  getAllStaff,
  updateStaff,
  toggleStaffStatus,
  deleteStaff
};
