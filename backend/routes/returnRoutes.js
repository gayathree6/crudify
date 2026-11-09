
const express = require("express");
const router = express.Router();

const {
  getBillForReturn,
  createReturn,
  approveReturn,
  rejectReturn,
  getReturns,
  getReturnById,
} = require("../controllers/returnController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

router.use(protect);

// Staff and Admin can search bills and submit requests
router.get("/bill/:billNumber", getBillForReturn);
router.post("/", createReturn);

// Staff sees their own requests; Admin sees all
router.get("/", getReturns);
router.get("/:id", getReturnById);

// Only Admin can approve or reject
router.patch("/:id/approve", adminOnly, approveReturn);
router.patch("/:id/reject", adminOnly, rejectReturn);

module.exports = router;
