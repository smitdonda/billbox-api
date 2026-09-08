const express = require("express");
const controller = require("../controllers/profile.controller");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

router.use(requireAuth);

// One profile per account, so no id in the path. PUT rather than POST because
// saving it twice has to mean the same thing as saving it once.
router.route("/").get(controller.get).put(controller.save);

module.exports = router;
