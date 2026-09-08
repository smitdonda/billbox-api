const cors = require("cors");
const env = require("./env");
const ApiError = require("../utils/ApiError");

/*
 * The configured CORS middleware. The allowlist itself lives in config/env.js;
 * what happens to an origin that is not on it is decided here.
 */

if (!env.cors.origins.length && env.isProduction) {
  console.warn(
    "CORS_ORIGIN is not set — cross-origin browser requests will be refused. " +
      "That is correct when the frontend proxies /api to this server."
  );
}

module.exports = cors({
  origin: (origin, callback) => {
    // No Origin header: same-origin navigation, curl, a health probe.
    if (!origin || env.cors.origins.includes(origin)) {
      return callback(null, true);
    }
    // Carry a status, or the error handler logs a rejected origin as a 500
    // and any passer-by can fill the logs with stack traces.
    return callback(ApiError.forbidden("Not allowed by CORS"));
  },
  // Required for the browser to send and store the session cookie.
  credentials: true,
});
