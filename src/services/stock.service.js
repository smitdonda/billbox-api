const { Product } = require("../models");
const ApiError = require("../utils/ApiError");
const { isObjectId } = require("../utils/objectId");

/*
 * Moving units on and off the shelf. Deciding how many to move is arithmetic
 * and lives in utils/billing.js; this module is the part that writes.
 */

/**
 * Map a bill's line items to `{ productId -> units }`, within one account.
 *
 * Bills written before line items carried a productId are matched by their
 * catalogue number, then by name, so old records still adjust stock. Those
 * fallbacks are resolved in a single query rather than one per line.
 */
const tallyByProduct = async (lines = [], userId) => {
  if (!userId) throw new Error("tallyByProduct needs a user id");

  const usable = (Array.isArray(lines) ? lines : []).filter(
    (line) => (Number(line?.quantity) || 0) > 0
  );

  const needsLookup = usable.filter((line) => !isObjectId(line?.productId));

  // One round trip for every line that has to be matched the old way.
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

    // A product deleted after billing has no stock left to adjust.
    if (!productId) continue;
    tally.set(productId, (tally.get(productId) || 0) + quantity);
  }

  return tally;
};

/**
 * Apply a stock delta with a guard on each decrement, undoing what was already
 * applied if any product turns out to be short. Mongo standalone deployments
 * have no transactions, so compensation is the portable way to stay consistent.
 *
 * Every write is scoped to the owning account, so a forged productId belonging
 * to someone else matches nothing and is reported as missing.
 */
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
          ? `Not enough stock for "${product.productname}" — ${product.availableproductqty} in stock, ${consume} needed`
          : "A product on this bill no longer exists"
      );
    }

    applied.push([productId, consume]);
  }
};

module.exports = { tallyByProduct, applyStockDelta };
