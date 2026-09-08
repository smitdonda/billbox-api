const express = require("express");
const controller = require("../controllers/product.controller");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

// Stock is business data: every verb needs a signed-in user, and every query
// is scoped to that user's own records.
router.use(requireAuth);

router.route("/").get(controller.list).post(controller.create);
router.route("/:id").put(controller.update).delete(controller.remove);

module.exports = router;
