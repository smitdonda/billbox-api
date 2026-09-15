/**
 * A product at or below this many units needs restocking.
 *
 * One number for every place that says so: the dashboard's low-stock list and
 * the products page's "need restocking" count must never disagree about which
 * products they mean.
 */
const LOW_STOCK_AT = 5;

module.exports = { LOW_STOCK_AT };
