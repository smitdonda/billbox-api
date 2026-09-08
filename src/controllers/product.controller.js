const { asyncHandler } = require("../middleware/asyncHandler");
const productService = require("../services/product.service");
const { sendSuccess } = require("../utils/apiResponse");
const { parseObjectId } = require("../utils/objectId");
const { parseProductBody } = require("../validators/product.validator");

const list = asyncHandler(async (req, res) => {
  const { products, meta } = await productService.listProducts({
    userId: req.user._id,
    query: req.query,
  });

  return sendSuccess(res, {
    data: products,
    meta,
    message: "Get Product data successfully",
  });
});

const create = asyncHandler(async (req, res) => {
  const product = await productService.createProduct({
    userId: req.user._id,
    values: parseProductBody(req.body),
  });

  return sendSuccess(res, {
    status: 201,
    data: product,
    message: "Create Product successfully",
  });
});

const update = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct({
    userId: req.user._id,
    productId: parseObjectId(req.params.id),
    values: parseProductBody(req.body, { partial: true }),
  });

  return sendSuccess(res, {
    data: product,
    message: "Product updated successfully",
  });
});

const remove = asyncHandler(async (req, res) => {
  const product = await productService.deleteProduct({
    userId: req.user._id,
    productId: parseObjectId(req.params.id),
  });

  return sendSuccess(res, { data: product, message: "Delete Successfully" });
});

module.exports = { list, create, update, remove };
