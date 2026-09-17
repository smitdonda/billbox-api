const { Product } = require("../models");
const ApiError = require("../utils/ApiError");
const { isObjectId } = require("../utils/objectId");

// Returns a Map of productId -> total quantity for the given bill lines.
// Older bills have no productId, so those lines are matched by product id
// number or by name.
const tallyByProduct = async (lines = [], userId) => {
  if (!userId) throw new Error("tallyByProduct needs a user id");

  const usable = (Array.isArray(lines) ? lines : []).filter(
    (line) => (Number(line?.quantity) || 0) > 0
  );

  const needsLookup = usable.filter((line) => !isObjectId(line?.productId));

  const lookup = { byNumber: new Map(), byName: new Map() };

  if (needsLookup.length) {
    const numbers = [
      ...new Set(
        needsLookup
          .map((line) => Number(line?.id))
          .filter((value) => Number.isFinite(value))
      ),
    ];
    const names = [
      ...new Set(
        needsLookup
          .map((line) => line?.productname)
          .filter((value) => typeof value === "string" && value)
      ),
    ];

    const or = [];
    if (numbers.length) or.push({ id: { $in: numbers } });
    if (names.length) or.push({ productname: { $in: names } });

    if (or.length) {
      const matches = await Product.find({ user: userId, $or: or })
        .select("_id id productname")
        .lean();

      for (const match of matches) {
        if (!lookup.byNumber.has(match.id)) {
          lookup.byNumber.set(match.id, String(match._id));
        }
        if (!lookup.byName.has(match.productname)) {
          lookup.byName.set(match.productname, String(match._id));
        }
      }
    }
  }

  const tally = new Map();

  for (const line of usable) {
    const quantity = Number(line.quantity) || 0;

    let productId = null;
    if (isObjectId(line.productId)) {
      productId = String(line.productId);
    } else {
      const number = Number(line.id);
      productId =
        (Number.isFinite(number) ? lookup.byNumber.get(number) : null) ||
        lookup.byName.get(line.productname) ||
        null;
    }

    // product was deleted, nothing to adjust
    if (!productId) continue;
    tally.set(productId, (tally.get(productId) || 0) + quantity);
  }

  return tally;
};

// Applies the stock changes one product at a time. If a product does not
// have enough stock, the changes already made are undone.
const applyStockDelta = async (delta, userId) => {
  if (!userId) throw new Error("applyStockDelta needs a user id");

  const applied = [];

  for (const [productId, consume] of delta) {
    const filter =
      consume > 0
        ? {
            _id: productId,
            user: userId,
            availableproductqty: { $gte: consume },
          }
        : { _id: productId, user: userId };

    const result = await Product.updateOne(filter, {
      $inc: { availableproductqty: -consume },
    });

    if (result.matchedCount === 0) {
      for (const [doneId, doneQty] of applied) {
        await Product.updateOne(
          { _id: doneId, user: userId },
          { $inc: { availableproductqty: doneQty } }
        );
      }

      const product = await Product.findOne({ _id: productId, user: userId })
        .select("productname availableproductqty")
        .lean();

      throw ApiError.conflict(
        product
          ? `Not enough stock for "${product.productname}". ${product.availableproductqty} in stock, ${consume} needed`
          : "A product on this bill no longer exists"
      );
    }

    applied.push([productId, consume]);
  }
};

module.exports = { tallyByProduct, applyStockDelta };
