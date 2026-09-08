const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const helmet = require("helmet");

const env = require("./config/env");
const corsMiddleware = require("./config/cors");
const { healthz } = require("./controllers/health.controller");
const { errorHandler } = require("./middleware/errorHandler");
const { notFound } = require("./middleware/notFound");
const routes = require("./routes");

/*
 * Wiring only.
 *
 * What each middleware is configured with lives in config/, what each endpoint
 * does lives in controllers/ and services/, and how an error becomes a
 * response lives in middleware/errorHandler.js. This file says in what order
 * a request meets them.
 */
const app = express();

/*
 * Vercel terminates TLS and proxies one hop, so the socket address is theirs,
 * not the caller's. Trusting that single hop is what makes req.ip and the
 * login throttle read the real client address.
 */
app.set("trust proxy", 1);

app.use(helmet());
app.use(corsMiddleware);
app.use(logger(env.isProduction ? "combined" : "dev"));

// Cap the body so a single request cannot buffer an unbounded payload.
app.use(express.json({ limit: "1mb" }));

/*
 * No urlencoded parser on purpose. A cross-site HTML form can POST
 * form-encoded data without a preflight, which — now that the session rides in
 * a cookie — is exactly the shape a CSRF attempt takes. JSON bodies are
 * preflighted, so refusing to parse anything else closes that door. Nothing in
 * this API has ever accepted a form post.
 */
app.use(cookieParser());

// The landing page at /, and nothing else: this server has no assets to serve.
app.use(express.static(path.join(__dirname, "public")));

// Outside the API prefix and ahead of the database gate, so a broken database
// is reported rather than hidden behind the gate's generic "unavailable".
app.get("/healthz", healthz);

app.use(env.apiPrefix, routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
