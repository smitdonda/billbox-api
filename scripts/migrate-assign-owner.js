// Gives all old records (without a user) to one account and sets up the
// per-user counters.
// Run: npm run migrate:owner -- owner@example.com

const { run } = require("./_lib");

const User = require("../src/models/User");
const Product = require("../src/models/Product");
const Customer = require("../src/models/Customer");
const BillInfo = require("../src/models/BillInfo");
const Profile = require("../src/models/Profile");
const Counter = require("../src/models/Counter");

const OWNED = [
  ["products", Product, "Product"],
  ["customers", Customer, "Customer"],
  ["bills", BillInfo, "BillInformation"],
];

const emailArg = () => {
  const email = process.argv.slice(2).find((arg) => arg.includes("@"));
  if (!email) {
    throw new Error(
      "Pass the owner's email: npm run migrate:owner -- owner@example.com"
    );
  }
  return email.trim().toLowerCase();
};

run("2026-09-assign-owner", async (connection) => {
  const email = emailArg();
  const owner = await User.findOne({ email }).select("_id email");
  if (!owner) throw new Error(`No account found for ${email}`);

  const assigned = {};

  for (const [label, Model] of OWNED) {
    const result = await Model.collection.updateMany(
      { user: { $exists: false } },
      { $set: { user: owner._id } }
    );
    assigned[label] = result.modifiedCount;
  }

  // Only one profile per user is allowed, so only the first one is assigned
  const profiles = await Profile.collection
    .find({ user: { $exists: false } })
    .sort({ _id: 1 })
    .toArray();

  if (profiles.length) {
    await Profile.collection.updateOne(
      { _id: profiles[0]._id },
      { $set: { user: owner._id } }
    );
    assigned.profile = 1;

    if (profiles.length > 1) {
      const extra = profiles.slice(1).map((doc) => String(doc._id));
      console.warn(
        `${extra.length} extra company profile(s) were left without an owner. ` +
          `Delete them by hand if not needed: ${extra.join(", ")}`
      );
    }
  }

  const previousSeq = new Map(
    (await Counter.collection.find({ user: { $exists: false } }).toArray()).map(
      (doc) => [doc.type, doc.seq || 0]
    )
  );

  // The old unique index on `type` alone would block per-user counters
  try {
    await Counter.collection.dropIndex("type_1");
  } catch (error) {
    // 27 = index not found
    if (error.code !== 27) throw error;
  }

  // Continue each counter from the highest id in use or the old counter value
  const counters = {};
  for (const [, Model, counterType] of OWNED) {
    const [highest] = await Model.collection
      .find({ user: owner._id })
      .sort({ id: -1 })
      .limit(1)
      .toArray();

    const seq = Math.max(highest?.id || 0, previousSeq.get(counterType) || 0);
    await Counter.collection.updateOne(
      { user: owner._id, type: counterType },
      { $set: { user: owner._id, type: counterType, seq } },
      { upsert: true }
    );
    counters[counterType] = seq;
  }

  const removed = await Counter.collection.deleteMany({
    user: { $exists: false },
  });

  const indexed = [];
  const models = [Product, Customer, BillInfo, Counter];

  // The unique index on Profile.user fails while extra profiles have no user
  const extraProfiles = Math.max(0, profiles.length - 1);
  if (extraProfiles) {
    console.warn(
      `Skipping the company profile index: ${extraProfiles} profile(s) ` +
        `have no owner. Remove them, then run this again with --force.`
    );
  } else {
    models.push(Profile);
  }

  for (const Model of models) {
    await Model.syncIndexes();
    indexed.push(Model.collection.collectionName);
  }

  return {
    owner: owner.email,
    assigned,
    counters,
    oldCountersRemoved: removed.deletedCount,
    reindexed: indexed,
    ...(extraProfiles ? { extraProfiles } : {}),
    database: connection.name,
  };
});
