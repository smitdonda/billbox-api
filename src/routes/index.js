const express = require("express");
const { requireDatabase } = require("../middleware/requireDatabase");

/*
 * The whole API surface, in one readable table.
 *
 * Routers used to be mounted one by one in app.js, mixed in with CORS, the
 * body parser and the error handler, so "what endpoints does this server
 * have?" meant reading past the middleware to find out.
 *
 * Nothing here runs without a live database connection: the gate is mounted
 * once, in front of every resource, rather than repeated per router. The
 * health check deliberately sits outside it — see app.js.
 */
const router = express.Router();

router.use(requireDatabase);

router.use("/auth", require("./auth.routes"));
router.use("/customers", require("./customer.routes"));
router.use("/products", require("./product.routes"));
router.use("/bills", require("./bill.routes"));
router.use("/profile", require("./profile.routes"));
router.use("/dashboard", require("./dashboard.routes"));

module.exports = router;
