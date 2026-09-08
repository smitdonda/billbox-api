const { Counter } = require("../models");

/*
 * Hands out the next human-facing id for one user's collection.
 * findOneAndUpdate + $inc + upsert is atomic, so two concurrent creates can
 * never receive the same number.
 */
const nextCounterId = async (type, userId) => {
  if (!userId) throw new Error("nextCounterId needs a user id");

  const counter = await Counter.findOneAndUpdate(
    { type, user: userId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).exec();

  return counter.seq;
};

module.exports = { nextCounterId };
