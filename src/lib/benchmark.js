// Performance Benchmarking & Synthetic Dataset Helper 1.0

import { defaultState } from "../data/defaults.js";

/**
 * Generate a synthetic large dataset for load testing (10k customers, 50k bills, 20k inventory logs).
 * Development / testing utility only — does NOT pollute production state.
 */
export function generateLargeTestDataset(options = {}) {
  const customerCount = options.customerCount || 10000;
  const orderCount = options.orderCount || 50000;
  const inventoryLogCount = options.inventoryLogCount || 20000;

  const base = defaultState();

  // Synthetic Customers (10,000)
  const customers = [];
  for (let i = 1; i <= customerCount; i++) {
    const spend = Math.floor(Math.random() * 60000);
    let membership = "Silver";
    if (spend >= 50000) membership = "Platinum";
    else if (spend >= 10000) membership = "Gold";

    customers.push({
      id: `c_syn_${i}`,
      name: `Customer ${i}`,
      phone: `98000${String(i).padStart(5, "0")}`,
      email: `cust${i}@example.com`,
      membership,
      points: Math.floor(spend / 20),
      lifetimeSpend: spend,
      totalOrders: Math.floor(spend / 350) + 1,
      lastVisit: new Date(Date.now() - Math.floor(Math.random() * 90) * 86400000).toISOString()
    });
  }

  // Synthetic Orders (50,000)
  const orderHistory = [];
  const modes = ["Cash", "UPI", "Card"];
  const statuses = ["Paid", "Paid", "Paid", "Paid", "Pending", "Cancelled"];

  for (let i = 1; i <= orderCount; i++) {
    const status = statuses[i % statuses.length];
    const amount = 100 + (i % 900);
    orderHistory.push({
      id: `o_syn_${i}`,
      source: `Table ${(i % 15) + 1}`,
      customerName: `Customer ${(i % customerCount) + 1}`,
      customerId: `c_syn_${(i % customerCount) + 1}`,
      items: [
        { menuItemId: "m1", name: "Masala Tea", price: 40, qty: 2 },
        { menuItemId: "m3", name: "Veg Burger", price: 120, qty: 1 }
      ],
      subtotal: amount,
      discount: 0,
      gst: Math.round(amount * 0.05),
      grandTotal: amount + Math.round(amount * 0.05),
      paymentMode: modes[i % modes.length],
      status,
      paidAt: new Date(Date.now() - Math.floor(Math.random() * 365) * 86400000).toISOString()
    });
  }

  // Synthetic Inventory Logs (20,000)
  const inventoryLogs = [];
  for (let i = 1; i <= inventoryLogCount; i++) {
    inventoryLogs.push({
      id: `log_syn_${i}`,
      orderRef: `o_syn_${i}`,
      ingredientId: "inv_1",
      ingredientName: "Milk",
      type: "Sale",
      qty: -0.15,
      unit: "litre",
      reason: `Order #syn_${i}`,
      supplier: "Amul",
      cost: 9,
      date: new Date(Date.now() - Math.floor(Math.random() * 180) * 86400000).toISOString()
    });
  }

  return {
    ...base,
    customers,
    orderHistory,
    inventoryLogs
  };
}

/**
 * Measure execution time of an operation in milliseconds.
 */
export function measureTime(label, fn) {
  const start = performance.now();
  const result = fn();
  const duration = Math.round((performance.now() - start) * 100) / 100;
  return { duration, result, label };
}
