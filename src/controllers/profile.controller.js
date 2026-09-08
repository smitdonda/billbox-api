const { asyncHandler } = require("../middleware/asyncHandler");
const profileService = require("../services/profile.service");
const { sendSuccess } = require("../utils/apiResponse");
const { parseProfileBody } = require("../validators/profile.validator");

/*
 * A singleton resource: one company profile per account. It is addressed as
 * /profile with no id, because "whose profile" is already answered by the
 * session — the old /my-profile/:id let a client name a document it could only
 * ever have one of.
 */

const get = asyncHandler(async (req, res) => {
  const profile = await profileService.getProfile({ userId: req.user._id });

  return sendSuccess(res, {
    // null, not 404: "this account has not filled it in yet" is an answer the
    // screen renders, not a failed request.
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
