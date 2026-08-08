// Business Context Builder — Constructs structured, privacy-minimized prompts derived from Reports 3.0

import {
  computeRevenueMetrics,
  aggregateProductPerformance,
  aggregateHourlyPerformance,
  aggregateChannelPerformance,
  aggregateInventoryIntelligence
} from "../reportsAggregate.js";
import { filterByDateRange } from "../dateUtils.js";

export function buildStructuredBusinessContext(state = {}, period = "today") {
  const {
    orderHistory = [],
    menuItems = [],
    customers = [],
    inventory = [],
    recipes = {},
    inventoryLogs = []
  } = state;

  const currentOrders = filterByDateRange(orderHistory, "paidAt", period);
  const revenueMetrics = computeRevenueMetrics(currentOrders);
  const { bestSellers, slowMovers } = aggregateProductPerformance(currentOrders, menuItems);
  const { peakHour } = aggregateHourlyPerformance(currentOrders);
  const { tableRevenue, parcelRevenue } = aggregateChannelPerformance(currentOrders);
  const inventoryIntel = aggregateInventoryIntelligence(inventory, recipes, inventoryLogs, menuItems);

  const totalCustomers = customers.length;
  const returningCustomers = customers.filter((c) => (c.totalOrders || c.totalVisits || 0) > 1).length;
  const repeatRatePct = totalCustomers > 0 ? Math.round((returningCustomers / totalCustomers) * 100) : 0;

  // PRIVACY MINIMIZATION: Strip PINs, passwords, employee auth, customer phone numbers, addresses
  return {
    period,
    generatedAt: new Date().toISOString(),
    metrics: {
      netRevenue: revenueMetrics.paidRevenue,
      paidOrders: revenueMetrics.paidCount,
      pendingRevenue: revenueMetrics.pendingRevenue,
      pendingCount: revenueMetrics.pendingCount,
      refundsCount: revenueMetrics.cancelledCount,
      refundsValue: revenueMetrics.cancelledRevenue,
      aov: revenueMetrics.aov,
      discountsGiven: revenueMetrics.totalDiscounts
    },
    products: {
      topSellers: bestSellers.slice(0, 5).map((i) => ({ name: i.name, qty: i.unitsSold, revenue: i.revenue })),
      slowMovers: slowMovers.slice(0, 5).map((i) => ({ name: i.name, qty: i.unitsSold, recommendation: i.recommendation }))
    },
    channels: {
      dineInRevenue: tableRevenue,
      parcelRevenue: parcelRevenue
    },
    operations: {
      peakHour: peakHour ? peakHour.label : "Insufficient data",
      customerRepeatRatePct: repeatRatePct,
      totalCustomers: totalCustomers
    },
    inventory: {
      totalValuation: inventoryIntel.totalValuation,
      lowStockCount: inventoryIntel.lowStockCount,
      outOfStockCount: inventoryIntel.outOfStockCount,
      wastage7dCost: inventoryIntel.wastage7dCost,
      affectedMenuItemsCount: inventoryIntel.affectedMenuItems.length,
      affectedMenuNames: inventoryIntel.affectedMenuItems.map((m) => m.name)
    }
  };
}
