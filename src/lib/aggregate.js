// Pure aggregation helpers over order history.
//
// These were previously inlined in Dashboard, ReportsView, AIInsightsView, and
// loyalty.js (favoriteItem). Centralizing them removes four copies of the same
// map+reduce and gives us one place to evolve the aggregation when (not if)
// the order shape grows an itemId, station, serverId, etc.
//
// Performance: each helper indexes menuItems by id once (O(M)) and then looks
// up items in O(1), instead of doing menuItems.find inside the inner loop —
// which was O(M) per item and dominated CPU for large histories.

import { indexById } from "./menuIndex.js";

/**
 * Aggregate item quantities across an order history.
 * Returns a { name: qty } object keyed by resolved menu-item NAME (not id)
 * — matching the legacy display behavior everywhere it was used.
 *
 * @param {Array} orderHistory
 * @param {Array<{id,name}>} menuItems
 * @returns {Record<string, number>} name → total qty sold
 */
export function aggregateItemSales(orderHistory, menuItems) {
  const counts = {};
  const idx = indexById(menuItems);
  orderHistory.forEach((o) => {
    (o.items || []).forEach((it) => {
      const mi = idx.get(it.menuItemId);
      const name = mi ? mi.name : it.menuItemId;
      counts[name] = (counts[name] || 0) + it.qty;
    });
  });
  return counts;
}

/**
 * Return the top-N best-sellers by total qty, as [{ name, qty }].
 * N defaults to all sorted.
 */
export function topSellers(orderHistory, menuItems, n) {
  const entries = Object.entries(aggregateItemSales(orderHistory, menuItems))
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty);
  return typeof n === "number" ? entries.slice(0, n) : entries;
}

/**
 * Aggregate revenue per ISO day (YYYY-MM-DD). Order's `paidAt` is the source of
 * truth; orders without a paidAt bucket under "unknown".
 *
 * @returns {Record<string, number>} day → revenue
 */
export function revenueByDay(orderHistory) {
  const map = {};
  orderHistory.forEach((o) => {
    const day = o.paidAt ? o.paidAt.slice(0, 10) : "unknown";
    map[day] = (map[day] || 0) + (o.grandTotal || 0);
  });
  return map;
}

/**
 * Sum revenue across an order history. Honors the existing convention of
 * reading `o.grandTotal` (which already subtracts discounts, GST, and points).
 */
export function totalRevenue(orderHistory) {
  return orderHistory.reduce((s, o) => s + (o.grandTotal || 0), 0);
}
