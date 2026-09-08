const test = require("node:test");
const assert = require("node:assert/strict");

const {
  startTestApp,
  stopTestApp,
  clearDatabase,
  signIn,
  createProduct,
  lineFor,
} = require("../../test-helpers/app");

/*
 * Before ownership existed, requireAuth proved that *someone* was signed in
 * and then every route ran find({}). A second account saw, edited and deleted
 * the first account's stock, customers and invoices.
 *
 * This file is the standing proof that it cannot happen again. Each test sets
 * up two accounts and checks that the second one is answered as though the
 * first one's records simply are not there.
 */

let app;
let alice;
let bob;

test.before(async () => {
  app = await startTestApp();
});
test.after(async () => {
  await stopTestApp();
});
test.beforeEach(async () => {
  await clearDatabase();
  alice = await signIn(app, "alice@example.com", { username: "alice" });
  bob = await signIn(app, "bob@example.com", { username: "bob" });
});

/** Everything one account can own, created in one go. */
async function seedAlice() {
  const product = await createProduct(alice, {
    productname: "Alice Widget",
    availableproductqty: 20,
    unitprice: 50000,
  });

  const customer = (
    await alice
      .post("/api/customers")
      .send({
        name: "Alice Customer",
        email: "cust@example.com",
        phoneNo: "9876543210",
        gstNo: "24AAAAA0000A1Z5",
      })
      .expect(201)
  ).body.data;

  const bill = (
    await alice
      .post("/api/bills")
      .send({
        name: "Alice Customer",
        email: "cust@example.com",
        phoneNo: "9876543210",
        gstNo: "24AAAAA0000A1Z5",
        products: [lineFor(product, 2)],
      })
      .expect(201)
  ).body.data;

  const profile = (
    await alice
      .put("/api/profile")
      .send({ companyname: "Alice Trading", cemail: "hq@alice.example" })
      .expect(200)
  ).body.data;

  return { product, customer, bill, profile };
}

/* ------------------------------------------------------------------ */
/*  reading                                                            */
/* ------------------------------------------------------------------ */

test("one account's lists never contain another's records", async () => {
  await seedAlice();

  for (const [path, label] of [
    ["/api/products", "products"],
    ["/api/customers", "customers"],
    ["/api/bills", "bills"],
  ]) {
    const mine = await alice.get(path).expect(200);
    assert.equal(mine.body.data.length, 1, `alice should see her own ${label}`);

    const theirs = await bob.get(path).expect(200);
    assert.deepEqual(theirs.body.data, [], `bob must not see alice's ${label}`);
    assert.equal(theirs.body.meta.total, 0);
  }

  const profile = await bob.get("/api/profile").expect(200);
  assert.equal(profile.body.data, null);
});

test("fetching another account's bill by id is a 404, not a peek", async () => {
  const { bill } = await seedAlice();

  await alice.get(`/api/bills/${bill._id}`).expect(200);
  const res = await bob.get(`/api/bills/${bill._id}`).expect(404);
  assert.match(res.body.message, /not found/i);
});

test("the dashboard counts only what the caller owns", async () => {
  await seedAlice();

  const hers = await alice.get("/api/dashboard/summary").expect(200);
  assert.equal(hers.body.data.counts.product, 1);
  assert.equal(hers.body.data.counts.customer, 1);
  assert.equal(hers.body.data.counts.billInformation, 1);
  assert.ok(hers.body.data.billed > 0);
  assert.ok(hers.body.data.stockValue > 0);

  const his = await bob.get("/api/dashboard/summary").expect(200);
  assert.deepEqual(his.body.data.counts, {
    customer: 0,
    product: 0,
    billInformation: 0,
  });
  assert.equal(his.body.data.billed, 0);
  assert.equal(his.body.data.stockValue, 0);
  assert.deepEqual(his.body.data.recentBills, []);
  assert.deepEqual(his.body.data.chart, []);

  const count = await bob.get("/api/dashboard/count").expect(200);
  assert.equal(count.body.data.product, 0);
});

/* ------------------------------------------------------------------ */
/*  writing                                                            */
/* ------------------------------------------------------------------ */

test("another account cannot edit or delete a product", async () => {
  const { product } = await seedAlice();

  await bob
    .put(`/api/products/${product._id}`)
    .send({ productname: "Stolen", unitprice: 1 })
    .expect(404);

  await bob.delete(`/api/products/${product._id}`).expect(404);

  const still = await alice.get("/api/products").expect(200);
  assert.equal(still.body.data.length, 1);
  assert.equal(still.body.data[0].productname, "Alice Widget");
  assert.equal(still.body.data[0].unitprice, 50000);
});

test("another account cannot edit or delete a customer", async () => {
  const { customer } = await seedAlice();

  await bob
    .put(`/api/customers/${customer._id}`)
    .send({ name: "Stolen" })
    .expect(404);
  await bob.delete(`/api/customers/${customer._id}`).expect(404);

  const still = await alice.get("/api/customers").expect(200);
  assert.equal(still.body.data[0].name, "Alice Customer");
});

test("another account cannot edit or delete a bill", async () => {
  const { bill, product } = await seedAlice();

  await bob
    .put(`/api/bills/${bill._id}`)
    .send({ name: "Stolen", products: [lineFor(product, 1)] })
    .expect(404);

  await bob.delete(`/api/bills/${bill._id}`).expect(404);

  const still = await alice.get(`/api/bills/${bill._id}`).expect(200);
  assert.equal(still.body.data.name, "Alice Customer");
});

test("another account cannot overwrite the company letterhead", async () => {
  const { profile } = await seedAlice();

  /*
   * The profile has no id in the URL any more, so "write someone else's" is
   * not a request that can be phrased: bob's save is bob's own. What has to
   * hold is that it leaves alice's letterhead exactly where it was.
   */
  await bob.put("/api/profile").send({ companyname: "Stolen Ltd" }).expect(200);

  const still = await alice.get("/api/profile").expect(200);
  assert.equal(still.body.data._id, profile._id);
  assert.equal(still.body.data.companyname, "Alice Trading");
});

test("each account gets its own company profile, not a shared one", async () => {
  await seedAlice();

  await bob
    .put("/api/profile")
    .send({ companyname: "Bob Supplies" })
    .expect(200);

  const hers = await alice.get("/api/profile").expect(200);
  const his = await bob.get("/api/profile").expect(200);

  assert.equal(hers.body.data.companyname, "Alice Trading");
  assert.equal(his.body.data.companyname, "Bob Supplies");
});

test("saving the profile twice updates the one document instead of adding another", async () => {
  const first = await alice
    .put("/api/profile")
    .send({ companyname: "First" })
    .expect(200);
  const second = await alice
    .put("/api/profile")
    .send({ companyname: "Second" })
    .expect(200);

  assert.equal(second.body.data._id, first.body.data._id);

  const res = await alice.get("/api/profile").expect(200);
  assert.equal(res.body.data.companyname, "Second");
});

/* ------------------------------------------------------------------ */
/*  stock                                                              */
/* ------------------------------------------------------------------ */

test("a bill cannot consume stock belonging to another account", async () => {
  const { product } = await seedAlice();

  const before = (await alice.get("/api/products").expect(200)).body.data[0]
    .availableproductqty;

  // A real product id, posted by someone who does not own it.
  const res = await bob
    .post("/api/bills")
    .send({ name: "Bob", products: [lineFor(product, 5)] })
    .expect(409);

  assert.match(res.body.message, /no longer exists/i);

  const after = (await alice.get("/api/products").expect(200)).body.data[0]
    .availableproductqty;
  assert.equal(after, before, "alice's stock moved for someone else's bill");

  const bills = await bob.get("/api/bills").expect(200);
  assert.equal(bills.body.meta.total, 0, "the bill must not have been created");
});

/* ------------------------------------------------------------------ */
/*  numbering                                                          */
/* ------------------------------------------------------------------ */

test("human-facing ids start at 1 for every account", async () => {
  const hers = await createProduct(alice, { productname: "Hers" });
  const his = await createProduct(bob, { productname: "His" });

  assert.equal(hers.id, 1);
  assert.equal(his.id, 1);

  const second = await createProduct(alice, { productname: "Hers again" });
  assert.equal(second.id, 2);

  // Bob's own sequence is untouched by Alice creating two.
  const hisSecond = await createProduct(bob, { productname: "His again" });
  assert.equal(hisSecond.id, 2);
});

test("bills and customers keep separate sequences from products", async () => {
  await createProduct(alice, { productname: "P" });

  const customer = (
    await alice.post("/api/customers").send({ name: "C" }).expect(201)
  ).body.data;
  assert.equal(customer.id, 1);

  const product = await createProduct(alice, { productname: "Q" });
  const bill = (
    await alice
      .post("/api/bills")
      .send({ name: "C", products: [lineFor(product, 1)] })
      .expect(201)
  ).body.data;

  assert.equal(bill.id, 1);
});

/* ------------------------------------------------------------------ */
/*  input trust                                                        */
/* ------------------------------------------------------------------ */

test("an owner sent in the request body is ignored", async () => {
  const aliceMe = (await alice.get("/api/auth/me").expect(200)).body.data;

  // Bob tries to file a product under Alice's account.
  const res = await bob
    .post("/api/products")
    .send({
      productname: "Planted",
      availableproductqty: 1,
      unitprice: 100,
      user: aliceMe._id,
    })
    .expect(201);

  assert.notEqual(String(res.body.data.user), String(aliceMe._id));

  const hers = await alice.get("/api/products").expect(200);
  assert.equal(
    hers.body.meta.total,
    0,
    "the product landed in alice's account"
  );
});

test("an id sent in the request body does not override the counter", async () => {
  const res = await alice
    .post("/api/products")
    .send({
      productname: "Chosen",
      availableproductqty: 1,
      unitprice: 100,
      id: 9999,
    })
    .expect(201);

  assert.equal(res.body.data.id, 1);
});
