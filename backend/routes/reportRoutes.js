
const express = require("express");
const router = express.Router();

const { getReportOverview } = require("../controllers/reportController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

router.use(protect);
router.use(adminOnly);

router.get("/overview", getReportOverview);

module.exports = router;
