const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const request = require("supertest");

// Starts the app against an in-memory MongoDB for the route tests.
// Kept outside test/ so node --test does not run it as a test file.

const API = "/api";

let mongod = null;

async function startTestApp() {
  mongod = await MongoMemoryServer.create();

  // env.js reads these when the app is required, so set them first
  const testUri = mongod.getUri("billbook-test");
  process.env.MONGO_DB_URL = testUri;
  process.env.JWT_SECRET = "test-only-secret-not-used-anywhere-real";
  process.env.NODE_ENV = "test";
  process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS = "5000";
  delete process.env.CORS_ORIGIN;
  delete process.env.COOKIE_SAMESITE;
  delete process.env.COOKIE_SECURE;
  delete process.env.COOKIE_DOMAIN;

  const app = require("../src/app");

  // safety check so the tests never clear a real database
  if (process.env.MONGO_DB_URL !== testUri) {
    throw new Error(
      "Refusing to run: MONGO_DB_URL is not the in-memory test database."
    );
  }

  const { connectDatabase } = require("../src/config/database");
  await connectDatabase();

  // build the unique indexes before the tests run
  await Promise.all(
    Object.values(mongoose.models).map((model) => model.init())
  );

  return app;
}

async function stopTestApp() {
  await mongoose.disconnect().catch(() => {});
  if (mongod) await mongod.stop();
  mongod = null;
}

async function clearDatabase() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

const DEFAULT_PASSWORD = "Password1!";

// supertest agent keeps the session cookie like a browser does
async function signIn(app, email, { username = "tester" } = {}) {
  const agent = request.agent(app);

  await agent
    .post(`${API}/auth/signup`)
    .send({ email, username, password: DEFAULT_PASSWORD })
    .expect(201);

  await agent
    .post(`${API}/auth/login`)
    .send({ email, password: DEFAULT_PASSWORD })
    .expect(200);

  return agent;
}

// prices in paise
async function createProduct(agent, values = {}) {
  const res = await agent
    .post(`${API}/products`)
    .send({
      productname: "Widget",
      availableproductqty: 10,
      unitprice: 10000,
      ...values,
    })
    .expect(201);

  return res.body.data;
}

function lineFor(
  product,
  quantity = 1,
  gst = [{ title: "S GST 9%", value: 9 }]
) {
  return {
    productId: product._id,
    id: product.id,
    productname: product.productname,
    unitprice: product.unitprice,
    quantity,
    gst,
  };
}

async function stockOf(agent, productId) {
  const res = await agent
    .get(`${API}/products`)
    .query({ limit: 500 })
    .expect(200);
  const product = res.body.data.find((p) => p._id === String(productId));
  return product ? product.availableproductqty : null;
}

module.exports = {
  API,
  startTestApp,
  stopTestApp,
  clearDatabase,
  signIn,
  createProduct,
  lineFor,
  stockOf,
  DEFAULT_PASSWORD,
};
