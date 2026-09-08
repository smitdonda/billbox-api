const { asyncHandler } = require("../middleware/asyncHandler");
const customerService = require("../services/customer.service");
const { sendSuccess } = require("../utils/apiResponse");
const { parseObjectId } = require("../utils/objectId");
const { parseCustomerBody } = require("../validators/customer.validator");

const list = asyncHandler(async (req, res) => {
  const { customers, meta } = await customerService.listCustomers({
    userId: req.user._id,
    query: req.query,
  });

  return sendSuccess(res, {
    data: customers,
    meta,
    message: "Get customers",
  });
});

const create = asyncHandler(async (req, res) => {
  const customer = await customerService.createCustomer({
    userId: req.user._id,
    values: parseCustomerBody(req.body),
  });

  return sendSuccess(res, {
    status: 201,
    data: customer,
    message: "Create Customer Successfully",
  });
});

const update = asyncHandler(async (req, res) => {
  const customer = await customerService.updateCustomer({
    userId: req.user._id,
    customerId: parseObjectId(req.params.id),
    values: parseCustomerBody(req.body, { partial: true }),
  });

  return sendSuccess(res, {
    data: customer,
    message: "Customer Updated Successfully",
  });
});

const remove = asyncHandler(async (req, res) => {
  const customer = await customerService.deleteCustomer({
    userId: req.user._id,
    customerId: parseObjectId(req.params.id),
  });

  return sendSuccess(res, { data: customer, message: "Delete Successfully" });
});

module.exports = { list, create, update, remove };
