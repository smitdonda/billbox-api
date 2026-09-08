const { sendError } = require("../utils/apiResponse");

/** Same envelope as every other response, so clients read one shape. */
const notFound = (req, res) =>
  sendError(res, { status: 404, message: "URL_NOT_FOUND" });

module.exports = { notFound };
