const { asyncHandler } = require("../middleware/asyncHandler");
const dashboardService = require("../services/dashboard.service");
const { sendSuccess } = require("../utils/apiResponse");

const counts = asyncHandler(async (req, res) => {
  const data = await dashboardService.countAll(req.user._id);
  return sendSuccess(res, { data });
});

const summary = asyncHandler(async (req, res) => {
  const data = await dashboardService.getSummary({ userId: req.user._id });
  return sendSuccess(res, { data });
});

module.exports = { counts, summary };
