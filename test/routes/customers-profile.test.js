const test = require("node:test");
const assert = require("node:assert/strict");

const {
  startTestApp,
  stopTestApp,
  clearDatabase,
  signIn,
} = require("../../test-helpers/app");

let app;
let agent;

test.before(async () => {
  app = await startTestApp();
});
test.after(async () => {
  await stopTestApp();
});
test.beforeEach(async () => {
  await clearDatabase();
  agent = await signIn(app, "books@example.com", { username: "books" });
});

const addCustomer = (values = {}) =>
  agent.post("/api/customers").send({
    name: "Acme Traders",
    email: "billing@acme.example",
    phoneNo: "9876543210",
    gstNo: "24aaaaa0000a1z5",
    ...values,
  });

/* ------------------------------------------------------------------ */
/*  customers                                                          */
/* ------------------------------------------------------------------ */

test("a customer round-trips through create, list, update and delete", async () => {
  const created = (await addCustomer().expect(201)).body.data;
  assert.equal(created.id, 1);

  const listed = await agent.get("/api/customers").expect(200);
  assert.equal(listed.body.meta.total, 1);

  const updated = await agent
    .put(`/api/customers/${created._id}`)
    .send({ name: "Acme Trading Co" })
    .expect(200);
  assert.equal(updated.body.data.name, "Acme Trading Co");
  // A partial update must not blank the fields it did not mention.
  assert.equal(updated.body.data.email, "billing@acme.example");
  assert.equal(updated.body.data.gstNo, "24AAAAA0000A1Z5");

  await agent.delete(`/api/customers/${created._id}`).expect(200);
  await agent.delete(`/api/customers/${created._id}`).expect(404);
});

test("a customer needs a name", async () => {
  const res = await agent
    .post("/api/customers")
    .send({ email: "a@b.example" })
    .expect(422);
  assert.match(res.body.message, /name is required/i);
});

test("email is lowercased and GST uppercased on the way in", async () => {
  const created = (
    await addCustomer({
      email: "MiXeD@Acme.Example",
      gstNo: "24aaaaa0000a1z5",
    }).expect(201)
  ).body.data;

  assert.equal(created.email, "mixed@acme.example");
  assert.equal(created.gstNo, "24AAAAA0000A1Z5");
});

test("a phone number keeps its leading zero", async () => {
  const created = (await addCustomer({ phoneNo: "0123456789" }).expect(201))
    .body.data;
  assert.equal(created.phoneNo, "0123456789");
});

test("a malformed id is a 422 and an unknown one a 404", async () => {
  await agent.put("/api/customers/nope").send({ name: "x" }).expect(422);
  await agent
    .put("/api/customers/000000000000000000000000")
    .send({ name: "x" })
    .expect(404);
  await agent.delete("/api/customers/000000000000000000000000").expect(404);
});

test("customers page, search and sort server-side", async () => {
  for (let n = 1; n <= 7; n += 1) {
    await addCustomer({
      name: `Customer ${String(n).padStart(2, "0")}`,
      email: `c${n}@acme.example`,
      phoneNo: `98765432${String(n).padStart(2, "0")}`,
    }).expect(201);
  }

  const page = await agent
    .get("/api/customers")
    .query({ limit: 3, page: 2 })
    .expect(200);
  assert.equal(page.body.data.length, 3);
  assert.equal(page.body.meta.total, 7);
  assert.equal(page.body.meta.pageCount, 3);

  const byName = await agent
    .get("/api/customers")
    .query({ search: "Customer 03" })
    .expect(200);
  assert.equal(byName.body.meta.total, 1);

  const byPhone = await agent
    .get("/api/customers")
    .query({ search: "9876543205" })
    .expect(200);
  assert.equal(byPhone.body.meta.total, 1);
  assert.equal(byPhone.body.data[0].name, "Customer 05");

  const sorted = await agent
    .get("/api/customers")
    .query({ sort: "name", dir: "asc", limit: 2 })
    .expect(200);
  assert.deepEqual(
    sorted.body.data.map((c) => c.name),
    ["Customer 01", "Customer 02"]
  );
});

test("a customer search matches the GST number", async () => {
  await addCustomer({ name: "Findable", gstNo: "27BBBBB1111B2Z6" }).expect(201);
  await addCustomer({ name: "Other", gstNo: "24AAAAA0000A1Z5" }).expect(201);

  const res = await agent
    .get("/api/customers")
    .query({ search: "27BBBBB" })
    .expect(200);
  assert.equal(res.body.meta.total, 1);
  assert.equal(res.body.data[0].name, "Findable");
});

/* ------------------------------------------------------------------ */
/*  company profile                                                    */
/* ------------------------------------------------------------------ */

test("the company profile is created once and updated thereafter", async () => {
  const created = await agent
    .put("/api/profile")
    .send({
      companyname: "Books Ltd",
      cemail: "HQ@Books.Example",
      address: "1 High Street",
      city: "Surat",
      state: "Gujarat",
      pinno: "395007",
      phone: "9876543210",
    })
    .expect(200);

  assert.equal(created.body.data.companyname, "Books Ltd");
  assert.equal(created.body.data.cemail, "hq@books.example");
  // Identifiers, not quantities — a PIN code keeps its shape.
  assert.equal(created.body.data.pinno, "395007");

  const again = await agent
    .put("/api/profile")
    .send({ companyname: "Books Limited" })
    .expect(200);
  assert.equal(again.body.data.companyname, "Books Limited");
  // The fields the second save did not mention survive.
  assert.equal(again.body.data.city, "Surat");

  // Saving twice makes one profile, not two: the resource is a singleton.
  assert.equal(again.body.data._id, created.body.data._id);

  const read = await agent.get("/api/profile").expect(200);
  assert.equal(read.body.data.companyname, "Books Limited");
});

test("the company profile needs a name", async () => {
  const res = await agent
    .put("/api/profile")
    .send({ city: "Surat" })
    .expect(422);
  assert.match(res.body.message, /company name is required/i);
});

test("an account with no profile yet gets null, not a 404", async () => {
  const res = await agent.get("/api/profile").expect(200);
  assert.equal(res.body.data, null);
});
