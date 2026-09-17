require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");

// Helper for the migration scripts. Each migration is saved in the
// "migrations" collection so it only runs once (use --force to run it again).

const connect = async () => {
  if (!process.env.MONGO_DB_URL) {
    throw new Error("MONGO_DB_URL is not set");
  }
  await mongoose.connect(process.env.MONGO_DB_URL, {
    serverSelectionTimeoutMS: 10000,
  });
  return mongoose.connection;
};

const migrations = () => mongoose.connection.collection("migrations");

const run = async (name, fn) => {
  const force = process.argv.includes("--force");
  let code = 0;

  try {
    await connect();

    if (!force && (await migrations().findOne({ name }))) {
      console.log(`${name}: already applied, nothing to do.`);
      return;
    }

    const detail = (await fn(mongoose.connection)) || {};
    await migrations().updateOne(
      { name },
      { $set: { name, detail, appliedAt: new Date() } },
      { upsert: true }
    );
    console.log(`${name}: done.`, detail);
  } catch (error) {
    console.error(`${name}: failed.`, error.message);
    code = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
    process.exit(code);
  }
};

module.exports = { run };
