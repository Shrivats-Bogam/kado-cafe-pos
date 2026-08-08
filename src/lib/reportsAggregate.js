// Centralized Read-Only Aggregation Engine for Reports & Business Intelligence 3.0
import { indexById } from "./menuIndex.js";

/**
 * Filter orders by status
 */
export function getPaidOrders(orders = []) {
  return orders.filter((o) => o.status === "Paid");
}

export function getPendingOrders(orders = []) {
  return orders.filter((o) => o.status === "Pending");
}

export function getCancelledOrders(orders = []) {
  return orders.filter((o) => o.status === "Cancelled" || o.status === "Refunded");
}

/**
 * Compute Revenue Metrics cleanly according to Billing 3.0 lifecycle
 */
export function computeRevenueMetrics(orders = []) {
  let paidRevenue = 0;
  let pendingRevenue = 0;
  let cancelledRevenue = 0;
  let totalDiscounts = 0;
  let totalGst = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let cancelledCount = 0;

  orders.forEach((o) => {
    const total = Number(o.grandTotal) || 0;
    const disc = Number(o.discount) || 0;
    const gst = Number(o.gst) || 0;

    totalDiscounts += disc;
    totalGst += gst;

    if (o.status === "Paid") {
      paidRevenue += total;
      paidCount++;
    } else if (o.status === "Pending") {
      pendingRevenue += total;
      pendingCount++;
    } else if (o.status === "Cancelled" || o.status === "Refunded") {
      cancelledRevenue += total;
      cancelledCount++;
    }
  });

  const aov = paidCount > 0 ? Math.round(paidRevenue / paidCount) : 0;

  return {
    paidRevenue,
    pendingRevenue,
    cancelledRevenue,
    totalDiscounts,
    totalGst,
    paidCount,
    pendingCount,
    cancelledCount,
    totalOrders: orders.length,
    aov
  };
}

/**
 * Compute comparison growth between current & previous period metrics
 */
export function computeGrowth(currentVal = 0, previousVal = 0) {
  if (!previousVal || previousVal === 0) {
    return { pct: null, label: "No previous-period data" };
  }
  const pct = Math.round(((currentVal - previousVal) / previousVal) * 1000) / 10;
  return { pct, label: `${pct >= 0 ? "+" : ""}${pct}% vs previous period` };
}

/**
 * Aggregate Best Sellers & Slow Movers using historical order snapshots
 */
export function aggregateProductPerformance(orders = [], menuItems = []) {
  const itemMap = {};
  const menuIdx = indexById(menuItems);

  // Initialize with all active menu items
  menuItems.forEach((m) => {
    itemMap[m.id] = {
      id: m.id,
      name: m.name,
      category: m.category || "General",
      price: m.price,
      unitsSold: 0,
      revenue: 0,
      orderCount: 0,
      available: m.available !== false
    };
  });

  // Accumulate from paid orders
  const paidOrders = getPaidOrders(orders);
  paidOrders.forEach((o) => {
    (o.items || []).forEach((it) => {
      const mId = it.menuItemId;
      const qty = Number(it.qty) || 1;
      const price = Number(it.price) || 0;
      const itemRev = qty * price;

      if (!itemMap[mId]) {
        const mi = menuIdx.get(mId);
        itemMap[mId] = {
          id: mId,
          name: mi?.name || it.name || mId,
          category: mi?.category || "General",
          price: price || mi?.price || 0,
          unitsSold: 0,
          revenue: 0,
          orderCount: 0,
          available: true
        };
      }

      itemMap[mId].unitsSold += qty;
      itemMap[mId].revenue += itemRev;
      itemMap[mId].orderCount += 1;
    });
  });

  const allList = Object.values(itemMap);

  // Top Sellers (sorted by units sold)
  const bestSellers = [...allList]
    .filter((i) => i.unitsSold > 0)
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 10);

  // Slow Movers (items with <= 2 sales in period)
  const slowMovers = [...allList]
    .filter((i) => i.available && i.unitsSold <= 2)
    .sort((a, b) => a.unitsSold - b.unitsSold)
    .slice(0, 8)
    .map((i) => ({
      ...i,
      recommendation: i.unitsSold === 0 ? "Low sales — Consider promotion" : "Review pricing & placement"
    }));

  return { bestSellers, slowMovers };
}

/**
 * Analyze Peak Hours (Hourly distribution)
 */
export function aggregateHourlyPerformance(orders = []) {
  const hourly = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour} ${hour >= 12 ? "PM" : "AM"}`,
    orders: 0,
    revenue: 0
  }));

  const paidOrders = getPaidOrders(orders);
  paidOrders.forEach((o) => {
    const timeStr = o.paidAt || o.createdAt;
    if (timeStr) {
      const h = new Date(timeStr).getHours();
      if (h >= 0 && h < 24) {
        hourly[h].orders += 1;
        hourly[h].revenue += Number(o.grandTotal) || 0;
      }
    }
  });

  // Determine peak hour
  const sorted = [...hourly].sort((a, b) => b.orders - a.orders);
  const peakHour = sorted[0]?.orders > 0 ? sorted[0] : null;

  return { hourly, peakHour };
}

/**
 * Aggregate Table & Parcel Channel Analytics
 */
export function aggregateChannelPerformance(orders = []) {
  const paidOrders = getPaidOrders(orders);
  let tableOrders = 0;
  let tableRevenue = 0;
  let parcelOrders = 0;
  let parcelRevenue = 0;

  const tableStats = {};

  paidOrders.forEach((o) => {
    const isParcel = o.source === "Parcel" || (o.id && String(o.id).startsWith("P"));
    const total = Number(o.grandTotal) || 0;

    if (isParcel) {
      parcelOrders++;
      parcelRevenue += total;
    } else {
      tableOrders++;
      tableRevenue += total;
      const tableName = o.source || "Table";
      if (!tableStats[tableName]) {
        tableStats[tableName] = { name: tableName, orders: 0, revenue: 0 };
      }
      tableStats[tableName].orders++;
      tableStats[tableName].revenue += total;
    }
  });

  const tableList = Object.values(tableStats).sort((a, b) => b.revenue - a.revenue);

  return {
    tableOrders,
    tableRevenue,
    parcelOrders,
    parcelRevenue,
    tableList
  };
}

/**
 * Aggregate Payment Modes Breakdown
 */
export function aggregatePaymentBreakdown(orders = []) {
  const modes = {
    Cash: { count: 0, amount: 0 },
    UPI: { count: 0, amount: 0 },
    Card: { count: 0, amount: 0 },
    Split: { count: 0, amount: 0 },
    Pending: { count: 0, amount: 0 }
  };

  let totalAmount = 0;

  orders.forEach((o) => {
    const total = Number(o.grandTotal) || 0;

    if (o.status === "Pending") {
      modes.Pending.count++;
      modes.Pending.amount += total;
      return;
    }

    if (o.status !== "Paid") return;

    if (Array.isArray(o.paymentBreakdown) && o.paymentBreakdown.length > 0) {
      modes.Split.count++;
      o.paymentBreakdown.forEach((p) => {
        const amt = Number(p.amount) || 0;
        const m = String(p.method || "Cash").toUpperCase();
        if (m.includes("UPI") || m.includes("QR")) {
          modes.UPI.amount += amt;
        } else if (m.includes("CARD")) {
          modes.Card.amount += amt;
        } else {
          modes.Cash.amount += amt;
        }
      });
      totalAmount += total;
    } else {
      const modeStr = String(o.paymentMode || "Cash").toUpperCase();
      if (modeStr.includes("UPI") || modeStr.includes("QR")) {
        modes.UPI.count++;
        modes.UPI.amount += total;
      } else if (modeStr.includes("CARD")) {
        modes.Card.count++;
        modes.Card.amount += total;
      } else {
        modes.Cash.count++;
        modes.Cash.amount += total;
      }
      totalAmount += total;
    }
  });

  return { modes, totalAmount };
}

/**
 * Aggregate Inventory & Shortage Intelligence
 */
export function aggregateInventoryIntelligence(inventory = [], recipes = {}, inventoryLogs = [], menuItems = []) {
  let totalValuation = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  const outOfStockIds = new Set();
  const lowStockIds = new Set();

  inventory.forEach((i) => {
    const stock = Number(i.currentStock) || 0;
    const min = Number(i.minStock) || 0;
    const price = Number(i.costPrice) || 0;

    totalValuation += stock * price;

    if (stock <= 0) {
      outOfStockCount++;
      outOfStockIds.add(i.id);
    } else if (stock <= min) {
      lowStockCount++;
      lowStockIds.add(i.id);
    }
  });

  // Calculate purchases & wastage from inventoryLogs
  let purchases7dCost = 0;
  let wastage7dCost = 0;
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  inventoryLogs.forEach((log) => {
    if (log.date >= sevenDaysAgo) {
      if (log.type === "Purchase") {
        purchases7dCost += Math.abs(Number(log.cost) || 0);
      } else if (log.type === "Wastage" || log.type === "Damage") {
        wastage7dCost += Math.abs(Number(log.cost) || 0);
      }
    }
  });

  // Find affected Menu 3.0 items
  const affectedMenuItems = [];
  menuItems.forEach((m) => {
    const itemRecipe = recipes[m.id];
    if (itemRecipe && Array.isArray(itemRecipe)) {
      const hasOut = itemRecipe.some((r) => outOfStockIds.has(r.ingredientId));
      if (hasOut) {
        affectedMenuItems.push(m);
      }
    }
  });

  return {
    totalValuation,
    lowStockCount,
    outOfStockCount,
    purchases7dCost,
    wastage7dCost,
    affectedMenuItems
  };
}

/**
 * Rule-Based Owner Insights & Needs Attention Actionable Warnings
 */
export function generateOwnerInsights(state = {}, periodMetrics = {}) {
  const { inventory = [], recipes = {}, inventoryLogs = [], menuItems = [], kitchenTickets = [], customers = [] } = state;
  const { current, previous, rangeLabel } = periodMetrics;

  const warnings = [];
  const insights = [];

  // 1. Out of Stock / Low Stock Warnings
  const outOfStock = inventory.filter((i) => (i.currentStock || 0) <= 0);
  const lowStock = inventory.filter((i) => (i.currentStock || 0) > 0 && (i.currentStock || 0) <= (i.minStock || 0));

  if (outOfStock.length > 0) {
    warnings.push({
      type: "danger",
      title: `${outOfStock.length} Ingredient(s) Out of Stock`,
      detail: `${outOfStock.map((i) => i.name).join(", ")} reached 0 stock.`
    });
  }

  if (lowStock.length > 0) {
    warnings.push({
      type: "warning",
      title: `${lowStock.length} Ingredient(s) Low Stock`,
      detail: `Reorder alerts triggered for ${lowStock.map((i) => i.name).join(", ")}.`
    });
  }

  // 2. Pending Payments & Refunds Warnings
  if (current?.pendingCount > 0) {
    warnings.push({
      type: "info",
      title: `${current.pendingCount} Pending Payment(s)`,
      detail: `Total pending revenue: ₹${current.pendingRevenue.toLocaleString()}`
    });
  }

  if (current?.cancelledCount > 0) {
    warnings.push({
      type: "warning",
      title: `${current.cancelledCount} Cancelled / Refunded Order(s)`,
      detail: `Total refunded value: ₹${current.cancelledRevenue.toLocaleString()}`
    });
  }

  // 3. Unconfigured Recipes
  const unconfiguredRecipes = menuItems.filter((m) => !recipes[m.id] || recipes[m.id].length === 0);
  if (unconfiguredRecipes.length > 0) {
    warnings.push({
      type: "info",
      title: `${unconfiguredRecipes.length} Menu Item(s) Without Recipe`,
      detail: `Automatic stock deduction disabled for ${unconfiguredRecipes.slice(0, 3).map((m) => m.name).join(", ")}.`
    });
  }

  // Insights
  if (current && previous && previous.paidRevenue > 0) {
    const diff = current.paidRevenue - previous.paidRevenue;
    const pct = Math.round((diff / previous.paidRevenue) * 100);
    insights.push(
      `Revenue is ${pct >= 0 ? "up" : "down"} ${Math.abs(pct)}% compared to ${rangeLabel.toLowerCase()}.`
    );
  } else {
    insights.push("Sample size build-up in progress for period growth comparison.");
  }

  if (current?.paidCount > 0) {
    insights.push(`Average Order Value (AOV) for this period is ₹${current.aov.toLocaleString()}.`);
  }

  const returningCustomers = customers.filter((c) => (c.totalOrders || c.totalVisits || 0) > 1);
  if (customers.length > 0) {
    const repeatRate = Math.round((returningCustomers.length / customers.length) * 100);
    insights.push(`Customer repeat rate is currently ${repeatRate}% (${returningCustomers.length} returning of ${customers.length} total).`);
  }

  return { warnings, insights };
}
