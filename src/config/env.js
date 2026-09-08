// quiet: dotenv 17 otherwise prints a promo banner into the server logs on
// every cold start.
require("dotenv").config({ quiet: true });

/*
 * Every environment variable this API reads is parsed here, once, and nowhere
 * else. Scattering process.env lookups through the code is how a typo in a
 * variable name survives to production: the module reading it just sees
 * undefined and quietly falls back. One module means one place to check what
 * the server is actually configured with.
 */

/** Fail at boot rather than at the first login with an unhelpful stack trace. */
const REQUIRED = ["MONGO_DB_URL", "JWT_SECRET"];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variable: ${missing.join(", ")}`);
  process.exit(1);
}

/** A number, or the fallback when the variable is unset or not a number. */
const readNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** A comma-separated variable as a list, with the blanks dropped. */
const readList = (value) =>
  String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

/*
 * CORS is an allowlist, and an empty allowlist means "refuse every
 * cross-origin browser request" rather than "allow anyone". The session lives
 * in a cookie, so a wildcard origin would hand any site on the internet an
 * authenticated channel into this API.
 *
 * The intended production shape is same-origin: the frontend rewrites /api to
 * this server (see inventory-billing/vercel.json), so no cross-origin request
 * is made at all and this list stays empty.
 */
const corsOrigins = readList(process.env.CORS_ORIGIN);
if (!corsOrigins.length && !isProduction) {
  // The CRA dev server, which is where a local frontend talks from.
  corsOrigins.push("http://localhost:3000");
}

/*
 * SameSite depends on how the app is deployed:
 *
 *  - Same origin (the frontend proxies /api to this server, which is the
 *    recommended setup) -> "lax". First-party, unaffected by third-party
 *    cookie blocking.
 *  - Separate domains (frontend on one vercel.app host, API on another)
 *    -> COOKIE_SAMESITE=none plus COOKIE_SECURE=true. Note that Safari and
 *    Chrome restrict third-party cookies, so that setup can stop working in
 *    browsers the app has no control over. Prefer the proxy.
 */
const cookieSameSite = (process.env.COOKIE_SAMESITE || "lax")
  .toLowerCase()
  .trim();

module.exports = {
  isProduction,
  port: process.env.PORT || 5000,

  /** Everything the browser app talks to hangs off this one prefix. */
  apiPrefix: "/api",

  mongo: {
    url: process.env.MONGO_DB_URL,
    // Serverless wants many small pools, not a few large ones.
    poolSize: readNumber(process.env.MONGO_POOL_SIZE, 5),
    // Fail the request instead of hanging the whole lambda when the cluster
    // is unreachable.
    serverSelectionTimeoutMs: readNumber(
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
    secure:
      process.env.COOKIE_SECURE !== undefined
        ? process.env.COOKIE_SECURE === "true"
        : // SameSite=None is rejected by browsers unless the cookie is also
          // Secure.
          cookieSameSite === "none" || isProduction,
    domain: process.env.COOKIE_DOMAIN || undefined,
  },

  cors: {
    origins: corsOrigins,
  },
};
