const ApiError = require("../utils/ApiError");

// id and user are set by the server, never taken from the body
const pick = (body = {}) => {
  const values = {};

  if (typeof body.productname === "string") {
    values.productname = body.productname.trim();
  }
  if (body.availableproductqty !== undefined) {
    values.availableproductqty = Math.trunc(Number(body.availableproductqty));
  }
  if (body.unitprice !== undefined) {
    values.unitprice = Math.trunc(Number(body.unitprice));
  }

  return values;
};

const hasInvalidNumber = (values) =>
  Object.entries(values).some(
    ([key, value]) =>
      key !== "productname" && (!Number.isFinite(value) || value < 0)
  );

// partial: true for updates, where missing fields are left unchanged
const parseProductBody = (body, { partial = false } = {}) => {
  const values = pick(body);

  if (!partial && !values.productname) {
    throw ApiError.unprocessable("Product name is required");
  }
  if (hasInvalidNumber(values)) {
    throw ApiError.unprocessable(
      "Quantity and unit price must be zero or more"
    );
  }

  return values;
};

module.exports = { parseProductBody };
