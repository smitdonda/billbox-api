/*
 * One response envelope for the whole API.
 *
 * Every endpoint used to name its payload after itself — `products`,
 * `customers`, `billinfo`, `bill`, `profile`, `data` — so the browser needed a
 * different unwrapping rule per screen, and a rename on the server was a
 * silently blank table on the client. The shape is now fixed:
 *
 *   { success: true, message?, data?, meta? }
 *   { success: false, message }
 *
 * `data` is the resource (or the array of them), `meta` is everything about
 * the response rather than the resource: paging, totals across the filter.
 */

/** @param {import("express").Response} res */
const sendSuccess = (res, { status = 200, message, data, meta } = {}) => {
  const body = { success: true };

  if (message !== undefined) body.message = message;
  if (data !== undefined) body.data = data;
  if (meta !== undefined) body.meta = meta;

  return res.status(status).json(body);
};

/** The failure half of the same envelope. Only the error handler sends these. */
const sendError = (res, { status = 500, message, headers } = {}) => {
  if (headers) res.set(headers);
  return res.status(status).json({ success: false, message });
};

module.exports = { sendSuccess, sendError };
