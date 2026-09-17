const env = require("../config/env");
const { sendError } = require("../utils/apiResponse");

// Mongoose errors that come from bad input
const translate = (err) => {
  if (err.name === "ValidationError") {
    return {
      status: 422,
      message: Object.values(err.errors)[0]?.message || "Validation failed",
    };
  }
  if (err.name === "CastError") {
    return { status: 422, message: "Invalid value" };
  }
  // duplicate key
  if (err.code === 11000) {
    return { status: 409, message: "That record already exists" };
  }

  return null;
};

// express only treats it as an error handler with 4 arguments
const errorHandler = (err, req, res, _next) => {
  const translated = translate(err);
  const status = translated?.status || err.status || err.statusCode || 500;

  if (status >= 500) console.error(err);

  const message =
    translated?.message ||
    (status >= 500 && env.isProduction
      ? "Internal Server Error"
      : err.message || "Internal Server Error");

  return sendError(res, { status, message, headers: err.headers });
};

module.exports = { errorHandler };
