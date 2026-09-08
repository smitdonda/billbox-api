const env = require("../config/env");
const { sendError } = require("../utils/apiResponse");

/*
 * The only place in the API that turns a thrown error into a response.
 */

/** Mongoose failures that are the client's fault, not the server's. */
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
  // A unique index that a check-then-write race got past.
  if (err.code === 11000) {
    return { status: 409, message: "That record already exists" };
  }

  return null;
};

// Four arguments is what marks a function as error middleware to express, so
// the unused one has to stay — named with the underscore the linter exempts.
const errorHandler = (err, req, res, _next) => {
  const translated = translate(err);
  const status = translated?.status || err.status || err.statusCode || 500;

  // Anything 5xx is ours to fix, so it goes to the log with its stack. Client
  // errors are the expected shape of a public API and would only be noise.
  if (status >= 500) console.error(err);

  const message =
    translated?.message ||
    (status >= 500 && env.isProduction
      ? "Internal Server Error"
      : err.message || "Internal Server Error");

  return sendError(res, { status, message, headers: err.headers });
};

module.exports = { errorHandler };
