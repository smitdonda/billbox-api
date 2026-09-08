const { asyncHandler } = require("../middleware/asyncHandler");
const billService = require("../services/bill.service");
const { sendSuccess } = require("../utils/apiResponse");
const { parseObjectId } = require("../utils/objectId");
const { parseBillBody } = require("../validators/bill.validator");

const list = asyncHandler(async (req, res) => {
  const { bills, meta } = await billService.listBills({
    userId: req.user._id,
    query: req.query,
  });

  return sendSuccess(res, {
    data: bills,
    meta,
    message: "Bill Information Successfully",
  });
});

const get = asyncHandler(async (req, res) => {
  const bill = await billService.getBill({
    userId: req.user._id,
    billId: parseObjectId(req.params.id),
  });

  return sendSuccess(res, { data: bill, message: "Bill Information" });
});

const create = asyncHandler(async (req, res) => {
  const bill = await billService.createBill({
    userId: req.user._id,
    ...parseBillBody(req.body),
  });

  return sendSuccess(res, {
    status: 201,
    data: bill,
    message: "Create Bill Information Successfully",
  });
});

const update = asyncHandler(async (req, res) => {
  const bill = await billService.updateBill({
    userId: req.user._id,
    billId: parseObjectId(req.params.id),
    ...parseBillBody(req.body),
  });

  return sendSuccess(res, {
    data: bill,
    message: "Bill Information Updated Successfully",
  });
});

const remove = asyncHandler(async (req, res) => {
  const bill = await billService.deleteBill({
    userId: req.user._id,
    billId: parseObjectId(req.params.id),
  });

  return sendSuccess(res, { data: bill, message: "Delete Successfully" });
});

module.exports = { list, get, create, update, remove };
