const express = require("express");
const controller = require("../controllers/dashboard.controller");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

router.use(requireAuth);

router.get("/count", controller.counts);
router.get("/summary", controller.summary);

module.exports = router;
