const { connectDatabase, isConnected } = require("../config/database");
const env = require("../config/env");
const { sendSuccess } = require("../utils/apiResponse");

/*
 * Liveness and readiness in one place, answered before the database gate so a
 * broken database is reported rather than hidden behind the gate's generic
 * "unavailable".
 *
 * It connects rather than reading the connection state, because on a cold
 * serverless instance nothing has connected yet: a passive readyState check
 * answers "disconnected" for a perfectly healthy deployment, and flaps
 * depending on which instance happens to take the request.
 */
const healthz = async (req, res) => {
  const started = Date.now();

  try {
    await connectDatabase();

    return sendSuccess(res, {
      data: {
        uptime: Math.round(process.uptime()),
        db: isConnected() ? "connected" : "connecting",
        checkMs: Date.now() - started,
      },
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      data: {
        uptime: Math.round(process.uptime()),
        db: "unreachable",
        checkMs: Date.now() - started,
      },
      message: env.isProduction ? "Database unreachable" : error.message,
    });
  }
};

module.exports = { healthz };
