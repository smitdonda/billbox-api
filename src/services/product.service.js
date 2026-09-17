const { Product } = require("../models");
const ApiError = require("../utils/ApiError");
const {
  parsePaging,
  pageMeta,
  searchFilter,
  parseSort,
} = require("../utils/pagination");
const { LOW_STOCK_AT } = require("../utils/stock");
const { nextCounterId } = require("./counter.service");

const SORTABLE = [
  "productname",
  "availableproductqty",
  "unitprice",
  "id",
  "updatedAt",
];

const SEARCHABLE = ["productname"];

const ownedBy = (userId, search) => ({
  user: userId,
  ...(searchFilter(search, SEARCHABLE) || {}),
});

const listProducts = async ({ userId, query = {} }) => {
  const { page, limit, skip } = parsePaging(query);
  const filter = ownedBy(userId, query.search);

  const [products, total, totals] = await Promise.all([
    Product.find(filter)
      .sort(parseSort(query, SORTABLE))
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
    // totals for all matching products, not only this page
    Product.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          units: { $sum: "$availableproductqty" },
          value: {
            $sum: { $multiply: ["$unitprice", "$availableproductqty"] },
          },
          lowStock: {
            $sum: {
              $cond: [{ $lte: ["$availableproductqty", LOW_STOCK_AT] }, 1, 0],
            },
          },
        },
      },
    ]),
  ]);

  return {
    products,
    meta: {
      ...pageMeta({ page, limit, total }),
      stockUnits: totals[0]?.units || 0,
      stockValue: totals[0]?.value || 0,
      lowStock: totals[0]?.lowStock || 0,
      lowStockAt: LOW_STOCK_AT,
    },
  };
};

const createProduct = async ({ userId, values }) => {
  const id = await nextCounterId("Product", userId);
  return Product.create({ ...values, id, user: userId });
};

const updateProduct = async ({ userId, productId, values }) => {
  const product = await Product.findOneAndUpdate(
    { _id: productId, user: userId },
    { $set: values },
    { new: true, runValidators: true }
  );

  if (!product) throw ApiError.notFound("Not found product");
  return product;
};

const deleteProduct = async ({ userId, productId }) => {
  const product = await Product.findOneAndDelete({
    _id: productId,
    user: userId,
  });

  if (!product) throw ApiError.notFound("Not found product");
  return product;
};

module.exports = {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};
