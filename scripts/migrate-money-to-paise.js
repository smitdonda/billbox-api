// Converts stored prices from rupees to paise.
// Take a backup first, then run: npm run migrate:money

const { run } = require("./_lib");

const Product = require("../src/models/Product");
const BillInfo = require("../src/models/BillInfo");

const toPaise = (field) => ({
  $round: [{ $multiply: [{ $ifNull: [field, 0] }, 100] }, 0],
});

run("2026-09-money-to-paise", async () => {
  const products = await Product.collection.updateMany({}, [
    { $set: { unitprice: toPaise("$unitprice") } },
  ]);

  const bills = await BillInfo.collection.updateMany({}, [
    {
      $set: {
        totalproductsprice: toPaise("$totalproductsprice"),
        products: {
          $map: {
            input: { $ifNull: ["$products", []] },
            as: "line",
            in: {
              $mergeObjects: [
                "$$line",
                {
                  unitprice: toPaise("$$line.unitprice"),
                  pandqtotal: toPaise("$$line.pandqtotal"),
                  gsttex: toPaise("$$line.gsttex"),
                  gst: {
                    $map: {
                      input: { $ifNull: ["$$line.gst", []] },
                      as: "slab",
                      in: {
                        $mergeObjects: [
                          "$$slab",
                          { taxAmount: toPaise("$$slab.taxAmount") },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    },
  ]);

  return {
    products: products.modifiedCount,
    bills: bills.modifiedCount,
  };
});
