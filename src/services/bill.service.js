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

  /*
   * The billed total is summed in the database over everything the filter
   * matches, not over the page. The dashboard used to fetch every bill just
   * to add up this one number in the browser.
   */
  const [bills, total, totals] = await Promise.all([
    BillInfo.find(filter)
      .sort(parseSort(query, SORTABLE, { createdAt: -1 }))
      .skip(skip)
      .limit(limit)
      .lean(),
    BillInfo.countDocuments(filter),
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

/**
 * Creates a bill, taking its units off the shelf first.
 *
 * Order matters: if anything is short the bill is never created, and if the
 * bill fails to save the units go straight back. There is no transaction to
 * lean on, so the compensating write is the guarantee.
 */
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
    // The bill failed to save — hand the stock back.
    await applyStockDelta(stockDelta(wanted, new Map()), userId).catch(
      () => {}
    );
    throw error;
  }
};

/**
 * Rewrites a bill, moving stock by the difference only.
 *
 * The old code decremented the full quantity again on every save, so editing a
 * bill drained stock twice.
 */
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

  // Cancelling a bill returns its units to the shelf. The bill is already
  // gone, so a failure here is logged rather than raised: there is nothing
  // left to roll back to.
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
