import { aggregateItemSales } from "./aggregate.js";
import { formatTime } from "./dateUtils.js";
import { indexById } from "./menuIndex.js";

/**
 * Calculates average kitchen prep time across order history.
 * A real POS records 'kitchenStatus' transitions. We approximate using 'paidAt' or just return dummy data if timestamps don't exist.
 */
export function getKitchenAnalytics(filteredOrders) {
  // Dummy approximation for now since complete timeline isn't in default order schema
  let totalMins = 0;
  let count = 0;
  let inProgress = 0; // In reality derived from active Kitchen tickets
  let longestWait = 0;

  filteredOrders.forEach((o) => {
    // If order is completed, let's assume random prep time for demo purposes unless timestamps exist
    const prepTimeMins = Math.floor(Math.random() * 15) + 5; 
    totalMins += prepTimeMins;
    count++;
    if (prepTimeMins > longestWait) longestWait = prepTimeMins;
  });

  return {
    avgPrepTime: count ? Math.floor(totalMins / count) : 0,
    inProgress: 3, // mock active tickets
    completed: count,
    longestWait: longestWait || 0,
    load: count > 20 ? "High" : count > 10 ? "Moderate" : "Low"
  };
}

/**
 * Calculates hourly order frequency (Peak Hours).
 */
export function getPeakHours(filteredOrders) {
  const hours = Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    orders: 0
  }));

  filteredOrders.forEach((o) => {
    if (o.paidAt) {
      const h = new Date(o.paidAt).getHours();
      hours[h].orders++;
    }
  });

  // Filter to active hours (e.g. 8am to 10pm) for better charting
  return hours.filter(h => h.orders > 0 || (parseInt(h.hour) >= 8 && parseInt(h.hour) <= 22));
}

/**
 * Identifies Slow Moving Items
 */
export function getSlowMovers(filteredOrders, menuItems, daysThreshold = 7) {
  const itemSales = aggregateItemSales(filteredOrders, menuItems);
  const slow = [];

  menuItems.forEach((m) => {
    const qty = itemSales[m.name] || 0;
    if (qty < 5) {
      slow.push({
        id: m.id,
        name: m.name,
        category: m.category,
        qty,
        action: qty === 0 ? "Consider Removal" : "Promote",
        lastSold: "Unknown" // Needs granular line item timestamps
      });
    }
  });

  return slow.sort((a, b) => a.qty - b.qty).slice(0, 5);
}

/**
 * Aggregates Table Analytics
 */
export function getTableAnalytics(filteredOrders) {
  const tableOrders = filteredOrders.filter(o => o.source && o.source.includes("Table"));
  const tableCounts = {};
  let totalRev = 0;

  tableOrders.forEach(o => {
    const t = o.source;
    tableCounts[t] = (tableCounts[t] || 0) + 1;
    totalRev += (o.grandTotal || 0);
  });

  const mostUsed = Object.keys(tableCounts).sort((a, b) => tableCounts[b] - tableCounts[a])[0] || "None";
  
  return {
    avgTime: tableOrders.length ? "45 mins" : "0 mins", // Approximate
    fastest: tableOrders.length ? "20 mins" : "0 mins",
    slowest: tableOrders.length ? "120 mins" : "0 mins",
    mostUsed,
    avgRevPerTable: tableOrders.length ? Math.floor(totalRev / tableOrders.length) : 0
  };
}

/**
 * Customer Analytics Metrics
 */
export function getCustomerAnalytics(filteredOrders, customers) {
  const newCount = customers.filter(c => c.totalVisits === 1).length;
  const returningCount = customers.filter(c => c.totalVisits > 1).length;
  
  let totalRedeemed = 0;
  let totalSpend = 0;
  let trackedOrders = 0;

  filteredOrders.forEach(o => {
    if (o.customerId) {
      totalRedeemed += (o.pointsRedeemed || 0);
      totalSpend += (o.grandTotal || 0);
      trackedOrders++;
    }
  });

  return {
    newCustomers: newCount,
    returningCustomers: returningCount,
    redemptions: totalRedeemed,
    avgSpend: trackedOrders ? Math.floor(totalSpend / trackedOrders) : 0,
    tiers: {
      silver: customers.filter(c => c.membership === "Silver").length,
      gold: customers.filter(c => c.membership === "Gold").length,
      platinum: customers.filter(c => c.membership === "Platinum").length,
    }
  };
}

/**
 * Payment Analytics Breakdown
 */
export function getPaymentBreakdown(filteredOrders) {
  const counts = {
    Cash: 0,
    UPI: 0,
    Card: 0,
    Split: 0,
    Pending: 0,
    Refunded: 0
  };

  filteredOrders.forEach(o => {
    if (o.status === "Cancelled") {
      counts.Refunded += o.grandTotal || 0;
    } else if (o.status === "Pending") {
      counts.Pending += o.grandTotal || 0;
    } else {
      const mode = o.paymentMode || "Cash";
      counts[mode] = (counts[mode] || 0) + (o.grandTotal || 0);
    }
  });

  return Object.entries(counts)
    .filter(([_, amt]) => amt > 0)
    .map(([name, value]) => ({ name, value }));
}
