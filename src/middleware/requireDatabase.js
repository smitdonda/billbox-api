const { connectDatabase } = require("../config/database");
const { sendError } = require("../utils/apiResponse");

// Answer 503 straight away instead of letting queries hang when the db is down
const requireDatabase = async (req, res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    console.error("MongoDB unavailable:", error.message);
    sendError(res, {
      status: 503,
      message: "Database unavailable, try again",
    });
  }
};

module.exports = { requireDatabase };
