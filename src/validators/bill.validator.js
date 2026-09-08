const ApiError = require("../utils/ApiError");
const { priceBill } = require("../utils/billing");

/** Customer details on the bill are a snapshot, separate from line items. */
const pickCustomer = (body = {}) => {
  const values = {};

  if (typeof body.name === "string") values.name = body.name;
  if (typeof body.email === "string") values.email = body.email;
  if (body.phoneNo != null) values.phoneNo = String(body.phoneNo);
  if (typeof body.gstNo === "string") values.gstNo = body.gstNo;

  return values;
};

/**
 * A bill as the server will store it: the customer snapshot plus line items
 * and a total recomputed from unit price and quantity. Nothing about the money
 * comes from the request — see utils/billing.js.
 */
const parseBillBody = (body = {}) => {
  const { products, totalproductsprice } = priceBill(body);

  if (!products.length) {
    throw ApiError.unprocessable("Add at least one product");
  }

  return { customer: pickCustomer(body), products, totalproductsprice };
};

module.exports = { parseBillBody };
