/**
 * Wraps an async route handler so a rejected promise reaches the error
 * handler.
 *
 * Express 4 does not await a handler, so an unhandled rejection inside one is
 * a request that never answers. The old routes each carried their own
 * try/catch ending in `next(error)` — the same eight lines around every
 * handler, and a silent hang the one time somebody left it out.
 */
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

module.exports = { asyncHandler };
