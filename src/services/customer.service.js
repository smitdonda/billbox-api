const { Customer } = require("../models");
const ApiError = require("../utils/ApiError");
const {
  parsePaging,
  pageMeta,
  searchFilter,
  parseSort,
} = require("../utils/pagination");
const { nextCounterId } = require("./counter.service");

const SORTABLE = ["name", "email", "id", "createdAt", "updatedAt"];
const SEARCHABLE = ["name", "email", "phoneNo", "gstNo"];

// Customer data is business data — every query is scoped to one account's own
// records.
const ownedBy = (userId, search) => ({
  user: userId,
  ...(searchFilter(search, SEARCHABLE) || {}),
});

const listCustomers = async ({ userId, query = {} }) => {
  const { page, limit, skip } = parsePaging(query);
  const filter = ownedBy(userId, query.search);

  /* The GST-registered count is over everything the filter matches, like the
     total beside it. A cleared GST number is stored as "", so that counts as
     unregistered along with a missing one. */
  const [customers, total, gstRegistered] = await Promise.all([
    Customer.find(filter)
      .sort(parseSort(query, SORTABLE))
      .skip(skip)
      .limit(limit)
      .lean(),
    Customer.countDocuments(filter),
    Customer.countDocuments({ ...filter, gstNo: { $nin: [null, ""] } }),
  ]);

  return {
    customers,
    meta: { ...pageMeta({ page, limit, total }), gstRegistered },
  };
};

const createCustomer = async ({ userId, values }) => {
  const id = await nextCounterId("Customer", userId);
  return Customer.create({ ...values, id, user: userId });
};

const updateCustomer = async ({ userId, customerId, values }) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: customerId, user: userId },
    { $set: values },
    { new: true, runValidators: true }
  );

  if (!customer) throw ApiError.notFound("Not Found Customer");
  return customer;
};

const deleteCustomer = async ({ userId, customerId }) => {
  const customer = await Customer.findOneAndDelete({
    _id: customerId,
    user: userId,
  });

  if (!customer) throw ApiError.notFound("Not Found Customer");
  return customer;
};

module.exports = {
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
