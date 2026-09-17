const { asyncHandler } = require("../middleware/asyncHandler");
const profileService = require("../services/profile.service");
const { sendSuccess } = require("../utils/apiResponse");
const { parseProfileBody } = require("../validators/profile.validator");

// One company profile per account, so there is no id in the url

const get = asyncHandler(async (req, res) => {
  const profile = await profileService.getProfile({ userId: req.user._id });

  // data is null when the profile has not been filled in yet
  return sendSuccess(res, {
    data: profile,
    message: "My profile data successfully",
  });
});

const save = asyncHandler(async (req, res) => {
  const profile = await profileService.saveProfile({
    userId: req.user._id,
    values: parseProfileBody(req.body),
  });

  return sendSuccess(res, {
    data: profile,
    message: "My profile data saved successfully",
  });
});

module.exports = { get, save };
