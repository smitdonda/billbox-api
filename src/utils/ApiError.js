// Error with an HTTP status, handled in middleware/errorHandler.js
class ApiError extends Error {
  constructor(status, message, headers) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    if (headers) this.headers = headers;
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

  static unprocessable(message = "Validation failed") {
    return new ApiError(422, message);
  }

  static tooManyRequests(message, retryAfterSeconds) {
    return new ApiError(429, message, {
      "Retry-After": String(retryAfterSeconds),
    });
  }
}

module.exports = ApiError;
