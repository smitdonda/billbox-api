const { connectDatabase, isConnected } = require("../config/database");
const env = require("../config/env");
const { sendSuccess } = require("../utils/apiResponse");

const healthz = async (req, res) => {
  const started = Date.now();

  try {
    // actually connect, a cold serverless instance has no connection yet
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
