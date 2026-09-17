const ApiError = require("../utils/ApiError");

const pick = (body = {}) => {
  const values = {};

  if (typeof body.name === "string") values.name = body.name;
  if (typeof body.email === "string") values.email = body.email;
  if (body.phoneNo != null) values.phoneNo = String(body.phoneNo);
  if (typeof body.gstNo === "string") values.gstNo = body.gstNo;

  return values;
};

// partial: true for updates, where missing fields are left unchanged
const parseCustomerBody = (body, { partial = false } = {}) => {
  const values = pick(body);

  if (!partial && !values.name) {
    throw ApiError.unprocessable("Customer name is required");
  }

  return values;
};

module.exports = { parseCustomerBody };
