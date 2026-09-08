const mongoose = require("mongoose");
const env = require("./env");

/*
 * On Vercel every warm lambda re-imports this module, and a fresh
 * mongoose.connect() per invocation opens a fresh pool. A few hundred cold
 * starts is enough to exhaust an Atlas connection quota, so the connection —
 * and the in-flight promise for it — is parked on globalThis, which survives
 * module re-evaluation inside one instance.
 */
const cached =
  globalThis.__inventoryMongo__ ||
  (globalThis.__inventoryMongo__ = { conn: null, promise: null });

/** True once the connection is usable. */
const isConnected = () => mongoose.connection.readyState === 1;

/**
 * Resolves once the connection is usable. Concurrent callers share one
 * attempt; a failed attempt is dropped so the next request can retry rather
 * than being stuck behind a rejected promise forever.
 */
const connectDatabase = () => {
  if (cached.conn && isConnected()) return Promise.resolve(cached.conn);

  if (!cached.promise) {
    mongoose.set("strictQuery", true);

    cached.promise = mongoose
      .connect(env.mongo.url, {
        serverSelectionTimeoutMS: env.mongo.serverSelectionTimeoutMs,
        maxPoolSize: env.mongo.poolSize,
        minPoolSize: 0,
      })
      .then((connection) => {
        cached.conn = connection;
        return connection;
      })
      .catch((error) => {
        cached.promise = null;
        cached.conn = null;
        throw error;
      });
  }

  return cached.promise;
};

mongoose.connection.on("error", (err) =>
  console.error("MongoDB error:", err.message)
);

// The driver reconnects on its own; a "disconnected" -> connect() listener
// would stack a fresh connection attempt on every blip.
mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected — driver will retry");
  cached.conn = null;
});

module.exports = { connectDatabase, isConnected };
