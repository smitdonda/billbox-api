const express = require("express");
const controller = require("../controllers/profile.controller");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

router.use(requireAuth);

router.route("/").get(controller.get).put(controller.save);

module.exports = router;
