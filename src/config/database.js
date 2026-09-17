const mongoose = require("mongoose");
const env = require("./env");

// Cache the connection so serverless functions don't open a new one per request
const cached =
  globalThis.__inventoryMongo__ ||
  (globalThis.__inventoryMongo__ = { conn: null, promise: null });

const isConnected = () => mongoose.connection.readyState === 1;

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
        // reset so the next request can try again
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

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected, driver will retry");
  cached.conn = null;
});

module.exports = { connectDatabase, isConnected };
