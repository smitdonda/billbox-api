const { toPaise, percentOf } = require("./money");
const { isObjectId } = require("./objectId");

// Works out the line totals on the server. Totals sent by the client are
// ignored. All amounts are in paise.
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

// Units to take from stock per product (negative means give back)
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
