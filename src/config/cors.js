const cors = require("cors");
const env = require("./env");
const ApiError = require("../utils/ApiError");

if (!env.cors.origins.length && env.isProduction) {
  console.warn(
    "CORS_ORIGIN is not set, cross-origin requests will be refused. " +
      "That is fine when the frontend proxies /api to this server."
  );
}

module.exports = cors({
  origin: (origin, callback) => {
    // no Origin header: same-origin request, curl, health checks
    if (!origin || env.cors.origins.includes(origin)) {
      return callback(null, true);
    }
    return callback(ApiError.forbidden("Not allowed by CORS"));
  },
  credentials: true,
});
