const express = require("express");
const { requireDatabase } = require("../middleware/requireDatabase");

const router = express.Router();

router.use(requireDatabase);

router.use("/auth", require("./auth.routes"));
router.use("/customers", require("./customer.routes"));
router.use("/products", require("./product.routes"));
router.use("/bills", require("./bill.routes"));
router.use("/profile", require("./profile.routes"));
router.use("/dashboard", require("./dashboard.routes"));

module.exports = router;
