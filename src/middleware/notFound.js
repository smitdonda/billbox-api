const { sendError } = require("../utils/apiResponse");

const notFound = (req, res) =>
  sendError(res, { status: 404, message: "URL_NOT_FOUND" });

module.exports = { notFound };
