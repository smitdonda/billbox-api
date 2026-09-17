const { BillInfo, Customer, Product } = require("../models");
const { LOW_STOCK_AT } = require("../utils/stock");

const LOW_STOCK_SHOWN = 6;
const CHART_ITEMS = 8;
const RECENT_BILLS = 6;
const SALES_MONTHS = 6;

// First day of the month, `back` months ago
const monthStart = (back) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - back, 1, 0, 0, 0, 0);
};

const countAll = async (user) => {
  const [customer, product, billInformation] = await Promise.all([
    Customer.countDocuments({ user }),
    Product.countDocuments({ user }),
    BillInfo.countDocuments({ user }),
  ]);

  return { customer, product, billInformation };
};

// Everything the dashboard page needs in one request. Amounts are in paise.
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
          productCount: { $size: { $ifNull: ["$products", []] } },
        },
      },
    ]),

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

  // Fill in months that have no bills so the chart always has 6 columns
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

  const thisMonth = monthlySales[monthlySales.length - 1];

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
    billedThisMonth: thisMonth?.total || 0,
    billsThisMonth: thisMonth?.bills || 0,
  };
};

module.exports = { countAll, getSummary };
