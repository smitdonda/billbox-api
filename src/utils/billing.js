const { toPaise, percentOf } = require("./money");
const { isObjectId } = require("./objectId");

/*
 * Pure bill arithmetic: what a line item costs and how many units of each
 * product a set of lines represents. Nothing here touches the database — the
 * stock writes that follow from these numbers live in services/stock.service.js.
 */

/**
 * Recompute a line item from its inputs.
 *
 * Totals are never taken from the request body — a client that posts its own
 * `gsttex` could otherwise bill any amount it likes. Amounts in and out are
 * whole paise, so every value here stays an exact integer.
 */
const priceLine = (line = {}) => {
  const unitprice = toPaise(line.unitprice);
  const quantity = Math.max(0, Math.trunc(Number(line.quantity)) || 0);
  const pandqtotal = unitprice * quantity;

  const gst = (Array.isArray(line.gst) ? line.gst : []).map((slab) => {
    const value = Math.max(0, Number(slab?.value) || 0);
    return {
      title: String(slab?.title || "").slice(0, 40),
      value,
      taxAmount: percentOf(pandqtotal, value),
    };
  });

  const gsttex = gst.reduce((sum, slab) => sum + slab.taxAmount, pandqtotal);

  return {
    productId: isObjectId(line.productId) ? line.productId : undefined,
    id: Number.isFinite(Number(line.id)) ? Number(line.id) : undefined,
    productname: String(line.productname || "").trim(),
    unitprice,
    quantity,
    pandqtotal,
    gsttex,
    gst,
  };
};

/** Normalise a whole bill body: clean line items plus a trustworthy total. */
const priceBill = (body = {}) => {
  const products = (Array.isArray(body.products) ? body.products : [])
    .map(priceLine)
    .filter((line) => line.quantity > 0 && line.productname);

  const totalproductsprice = products.reduce(
    (sum, line) => sum + line.gsttex,
    0
  );

  return { products, totalproductsprice };
};

/** How many units each product must give up (negative = give back). */
const stockDelta = (before = new Map(), after = new Map()) => {
  const delta = new Map();
  const ids = new Set([...before.keys(), ...after.keys()]);

  for (const id of ids) {
    const change = (after.get(id) || 0) - (before.get(id) || 0);
    if (change !== 0) delta.set(id, change);
  }

  return delta;
};

module.exports = { priceLine, priceBill, stockDelta };
