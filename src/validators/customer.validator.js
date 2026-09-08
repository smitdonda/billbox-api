const ApiError = require("../utils/ApiError");

/** Only these fields are writable; `id` and `user` are owned by the server. */
const pick = (body = {}) => {
  const values = {};

  if (typeof body.name === "string") values.name = body.name;
  if (typeof body.email === "string") values.email = body.email;
  if (body.phoneNo != null) values.phoneNo = String(body.phoneNo);
  if (typeof body.gstNo === "string") values.gstNo = body.gstNo;

  return values;
};

/**
 * @param {object} body The request body.
 * @param {{ partial?: boolean }} options `partial` is an edit, where an
 *   omitted field means "leave it alone" rather than "clear it".
 */
const parseCustomerBody = (body, { partial = false } = {}) => {
  const values = pick(body);

  if (!partial && !values.name) {
    throw ApiError.unprocessable("Customer name is required");
  }

  return values;
};

module.exports = { parseCustomerBody };
