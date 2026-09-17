const { BillInfo } = require("../models");
const ApiError = require("../utils/ApiError");
const { stockDelta } = require("../utils/billing");
const {
  parsePaging,
  pageMeta,
  searchFilter,
  parseSort,
} = require("../utils/pagination");
const { nextCounterId } = require("./counter.service");
const { tallyByProduct, applyStockDelta } = require("./stock.service");

const SORTABLE = ["id", "name", "totalproductsprice", "createdAt", "updatedAt"];
const SEARCHABLE = [
  "name",
  "email",
  "phoneNo",
  "gstNo",
  "products.productname",
];

const ownedBy = (userId, search) => ({
  user: userId,
  ...(searchFilter(search, SEARCHABLE) || {}),
});

const listBills = async ({ userId, query = {} }) => {
  const { page, limit, skip } = parsePaging(query);
  const filter = ownedBy(userId, query.search);

  const [bills, total, totals] = await Promise.all([
    BillInfo.find(filter)
      .sort(parseSort(query, SORTABLE, { createdAt: -1 }))
      .skip(skip)
      .limit(limit)
      .lean(),
    BillInfo.countDocuments(filter),
    // total of all matching bills, not only this page
    BillInfo.aggregate([
      { $match: filter },
      { $group: { _id: null, billed: { $sum: "$totalproductsprice" } } },
    ]),
  ]);

  return {
    bills,
    meta: {
      ...pageMeta({ page, limit, total }),
      totalBilled: totals[0]?.billed || 0,
    },
  };
};

const getBill = async ({ userId, billId }) => {
  const bill = await BillInfo.findOne({ _id: billId, user: userId });
  if (!bill) throw ApiError.notFound("Not found Bill Information");
  return bill;
};

// Stock is taken first. If saving the bill fails, the stock is put back.
const createBill = async ({
  userId,
  customer,
  products,
  totalproductsprice,
}) => {
  const wanted = await tallyByProduct(products, userId);
  await applyStockDelta(stockDelta(new Map(), wanted), userId);

  try {
    const id = await nextCounterId("BillInformation", userId);

    return await BillInfo.create({
      ...customer,
      products,
      totalproductsprice,
      id,
      user: userId,
    });
  } catch (error) {
    await applyStockDelta(stockDelta(wanted, new Map()), userId).catch(
      () => {}
    );
    throw error;
  }
};

// Only the difference between the old and new quantities is applied to stock
const updateBill = async ({
  userId,
  billId,
  customer,
  products,
  totalproductsprice,
}) => {
  const existing = await BillInfo.findOne({ _id: billId, user: userId });
  if (!existing) throw ApiError.notFound("Not found Bill Information");

  const before = await tallyByProduct(existing.products, userId);
  const after = await tallyByProduct(products, userId);
  await applyStockDelta(stockDelta(before, after), userId);

  try {
    return await BillInfo.findOneAndUpdate(
      { _id: billId, user: userId },
      { $set: { ...customer, products, totalproductsprice } },
      { new: true, runValidators: true }
    );
  } catch (error) {
    await applyStockDelta(stockDelta(after, before), userId).catch(() => {});
    throw error;
  }
};

const deleteBill = async ({ userId, billId }) => {
  const bill = await BillInfo.findOneAndDelete({ _id: billId, user: userId });
  if (!bill) throw ApiError.notFound("Not found Bill Information");

  // Put the stock back. The bill is already deleted, so only log a failure.
  const released = await tallyByProduct(bill.products, userId);
  await applyStockDelta(stockDelta(released, new Map()), userId).catch(
    (error) =>
      console.error("Could not restore stock for bill", billId, error.message)
  );

  return bill;
};

module.exports = {
  listBills,
  getBill,
  createBill,
  updateBill,
  deleteBill,
};
