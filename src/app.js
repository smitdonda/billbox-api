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

const app = express();

// Running behind the Vercel proxy
app.set("trust proxy", 1);

// Middleware
app.use(helmet());
app.use(corsMiddleware);
app.use(logger(env.isProduction ? "combined" : "dev"));
// JSON only. No urlencoded parser, so form posts from other sites are ignored.
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Kept outside /api so it still answers when the database is down
app.get("/healthz", healthz);

// Routes
app.use(env.apiPrefix, routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
