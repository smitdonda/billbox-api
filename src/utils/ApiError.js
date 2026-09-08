/*
 * An error that already knows what HTTP status it means.
 *
 * Handlers used to answer failures inline — `return res.status(422).json(...)`
 * in the middle of a service call — which put response shaping in every layer
 * and made the same rule read differently in two places. Anything below the
 * controller now throws one of these instead, and middleware/errorHandler.js
 * is the only code that writes an error response.
 */
class ApiError extends Error {
  /**
   * @param {number} status HTTP status to answer with.
   * @param {string} message Text the client is allowed to read.
   * @param {{ headers?: Record<string, string> }} [options] Extra response
   *   headers the status needs, such as Retry-After on a 429.
   */
  constructor(status, message, options = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    if (options.headers) this.headers = options.headers;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = "Bad request") {
    return new ApiError(400, message);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message);
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(403, message);
  }

  static notFound(message = "Not found") {
    return new ApiError(404, message);
  }

  static conflict(message = "Conflict") {
    return new ApiError(409, message);
  }

  /** The request parsed but its contents are not acceptable. */
  static unprocessable(message = "Validation failed") {
    return new ApiError(422, message);
  }

  /** Carries the wait in a Retry-After header, as the status is meant to. */
  static tooManyRequests(message, retryAfterSeconds) {
    return new ApiError(429, message, {
      headers: { "Retry-After": String(retryAfterSeconds) },
    });
  }

  static serviceUnavailable(message = "Service unavailable") {
    return new ApiError(503, message);
  }
}

module.exports = ApiError;
