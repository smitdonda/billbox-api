require("dotenv").config({ quiet: true });

const required = ["MONGO_DB_URL", "JWT_SECRET"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Missing required environment variable: ${missing.join(", ")}`);
  process.exit(1);
}

const toNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const toList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const isProduction = (process.env.NODE_ENV || "development") === "production";

// In production the frontend proxies /api, so no origins are needed there
const corsOrigins = toList(process.env.CORS_ORIGIN);
if (!corsOrigins.length && !isProduction) {
  corsOrigins.push("http://localhost:3000");
}

const cookieSameSite = (process.env.COOKIE_SAMESITE || "lax")
  .toLowerCase()
  .trim();

// Browsers reject SameSite=None cookies that are not Secure
const cookieSecure =
  process.env.COOKIE_SECURE !== undefined
    ? process.env.COOKIE_SECURE === "true"
    : cookieSameSite === "none" || isProduction;

module.exports = {
  isProduction,
  port: process.env.PORT || 5000,
  apiPrefix: "/api",

  mongo: {
    url: process.env.MONGO_DB_URL,
    poolSize: toNumber(process.env.MONGO_POOL_SIZE, 5),
    serverSelectionTimeoutMs: toNumber(
      process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS,
      8000
    ),
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRATION_TIME || "7d",
  },

  cookie: {
    name: "token",
    sameSite: cookieSameSite,
    secure: cookieSecure,
    domain: process.env.COOKIE_DOMAIN || undefined,
  },

  cors: {
    origins: corsOrigins,
  },
};
