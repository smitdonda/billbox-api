const express = require("express");
const controller = require("../controllers/customer.controller");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

router.use(requireAuth);

router.route("/").get(controller.list).post(controller.create);
router.route("/:id").put(controller.update).delete(controller.remove);

module.exports = router;
