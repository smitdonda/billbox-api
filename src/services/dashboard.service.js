const { BillInfo, Customer, Product } = require("../models");

/** A product at or below this many units is called out on the dashboard. */
const LOW_STOCK_AT = 5;
const LOW_STOCK_SHOWN = 6;
const CHART_ITEMS = 8;
const RECENT_BILLS = 6;
/** How many months of billing the dashboard column chart draws. */
const SALES_MONTHS = 6;

/*
 * The first instant of the month `back` months before the current one, in the
 * server's zone. Six months of columns means five months back plus this one.
 */
const monthStart = (back) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - back, 1, 0, 0, 0, 0);
};

// count() is deprecated in Mongoose 7; countDocuments() is the replacement.
const countAll = async (user) => {
  const [customer, product, billInformation] = await Promise.all([
    Customer.countDocuments({ user }),
    Product.countDocuments({ user }),
    BillInfo.countDocuments({ user }),
  ]);

  return { customer, product, billInformation };
};

/*
 * Everything the dashboard draws, in one read.
 *
 * It used to fetch every product and every bill and add them up in the
 * browser, which meant the page got slower with every invoice ever raised.
 * The sums and the top-N lists are the database's job; what crosses the wire
 * is now a fixed handful of rows whatever the account holds.
 *
 * All money is in paise.
 */
const getSummary = async ({ userId: user }) => {
  const [
    customerCount,
    productCount,
    billCount,
    billTotals,
    stockTotals,
    lowStock,
    lowStockCount,
    chart,
    recentBills,
    salesByMonth,
  ] = await Promise.all([
    Customer.countDocuments({ user }),
    Product.countDocuments({ user }),
    BillInfo.countDocuments({ user }),

    BillInfo.aggregate([
      { $match: { user } },
      { $group: { _id: null, billed: { $sum: "$totalproductsprice" } } },
    ]),

    Product.aggregate([
      { $match: { user } },
      {
        $group: {
          _id: null,
          value: {
            $sum: { $multiply: ["$unitprice", "$availableproductqty"] },
          },
          units: { $sum: "$availableproductqty" },
        },
      },
    ]),

    Product.find({ user, availableproductqty: { $lte: LOW_STOCK_AT } })
      .select("productname availableproductqty unitprice")
      .sort({ availableproductqty: 1, _id: 1 })
      .limit(LOW_STOCK_SHOWN)
      .lean(),

    Product.countDocuments({
      user,
      availableproductqty: { $lte: LOW_STOCK_AT },
    }),

    Product.find({ user })
      .select("productname availableproductqty")
      .sort({ availableproductqty: -1, _id: 1 })
      .limit(CHART_ITEMS)
      .lean(),

    BillInfo.aggregate([
      { $match: { user } },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: RECENT_BILLS },
      {
        $project: {
          id: 1,
          name: 1,
          createdAt: 1,
          totalproductsprice: 1,
          // The line items themselves are never rendered here, only counted.
          productCount: { $size: { $ifNull: ["$products", []] } },
        },
      },
    ]),

    /* Billing per calendar month, for the dashboard's column chart. Grouped in
       the database rather than by pulling every bill and bucketing them here,
       for the same reason as everything else above. */
    BillInfo.aggregate([
      { $match: { user, createdAt: { $gte: monthStart(SALES_MONTHS - 1) } } },
      {
        $group: {
          _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
          total: { $sum: "$totalproductsprice" },
          bills: { $sum: 1 },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1 } },
    ]),
  ]);

  /* A month with no bills returns no row, but the chart still needs its column
     — otherwise a quiet month silently shifts every other bar along. */
  const billedByMonth = new Map(
    salesByMonth.map((row) => [`${row._id.y}-${row._id.m}`, row])
  );
  const monthlySales = Array.from({ length: SALES_MONTHS }, (_, i) => {
    const date = monthStart(SALES_MONTHS - 1 - i);
    const row = billedByMonth.get(
      `${date.getFullYear()}-${date.getMonth() + 1}`
    );
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      total: row?.total || 0,
      bills: row?.bills || 0,
    };
  });

  return {
    counts: {
      customer: customerCount,
      product: productCount,
      billInformation: billCount,
    },
    billed: billTotals[0]?.billed || 0,
    stockValue: stockTotals[0]?.value || 0,
    stockUnits: stockTotals[0]?.units || 0,
    lowStockAt: LOW_STOCK_AT,
    lowStockCount,
    lowStock,
    chart: chart.map((product) => ({
      label: product.productname,
      value: product.availableproductqty,
    })),
    recentBills,
    monthlySales,
    /* The last entry is always the current month, so the header does not have
       to work out which column is "now". */
    billedThisMonth: monthlySales[monthlySales.length - 1]?.total || 0,
    billsThisMonth: monthlySales[monthlySales.length - 1]?.bills || 0,
  };
};

module.exports = {
  LOW_STOCK_AT,
  LOW_STOCK_SHOWN,
  CHART_ITEMS,
  RECENT_BILLS,
  SALES_MONTHS,
  countAll,
  getSummary,
};
