const { connectDatabase } = require("../config/database");
const { sendError } = require("../utils/apiResponse");

/**
 * Nothing downstream runs against a database that is not up.
 *
 * Without this gate a cold request queues on Mongoose's buffer and dies ten
 * seconds later as an opaque 500 — the connection failure itself only ever
 * appearing in the log.
 */
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
