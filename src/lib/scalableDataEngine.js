// scalableDataEngine.js — Synthetic High-Load Data Engine & Windowing Helpers (Sprint B1.3)

import { defaultState } from "../data/defaults.js";

/**
 * Generate synthetic high-load dataset scaling up to 100,000 orders, 10,000 customers, 1,000 menu items
 * @param {object} options 
 * @returns {object} High-load synthetic state blob
 */
export function generateHighLoadDataset(options = {}) {
  const orgCount = options.orgCount || 10;
  const menuCount = options.menuCount || 1000;
  const inventoryCount = options.inventoryCount || 1000;
  const customerCount = options.customerCount || 10000;
  const orderCount = options.orderCount || 100000;
  const inventoryLogCount = options.inventoryLogCount || 200000;

  const base = defaultState();
  const targetOrgId = options.organizationId || "00000000-0000-0000-0000-000000000001";

  // 1. Synthetic Categories & Menu Items (1,000)
  const menuItems = [];
  const categories = [];
  for (let c = 1; c <= 50; c++) {
    categories.push({ id: `cat_${c}`, name: `Category ${c}`, organization_id: targetOrgId });
  }

  for (let m = 1; m <= menuCount; m++) {
    const catId = `cat_${(m % 50) + 1}`;
    menuItems.push({
      id: `m_${m}`,
      name: `Menu Item ${m}`,
      price: 50 + (m % 450),
      category: catId,
      available: true,
      organization_id: targetOrgId
    });
  }

  // 2. Synthetic Inventory Items (1,000)
  const inventory = [];
  for (let i = 1; i <= inventoryCount; i++) {
    inventory.push({
      id: `inv_${i}`,
      name: `Ingredient ${i}`,
      qty: 100 + (i % 500),
      currentStock: 100 + (i % 500),
      unit: i % 2 === 0 ? "kg" : "litre",
      minStock: 20,
      cost: 10 + (i % 50),
      organization_id: targetOrgId
    });
  }

  // 3. Synthetic Customers (10,000)
  const customers = [];
  for (let c = 1; c <= customerCount; c++) {
    const spend = Math.floor(Math.random() * 60000);
    customers.push({
      id: `cust_${c}`,
      name: `Customer ${c}`,
      phone: `98000${String(c).padStart(5, "0")}`,
      email: `cust${c}@kado.cafe`,
      membership: spend >= 50000 ? "Platinum" : spend >= 10000 ? "Gold" : "Silver",
      points: Math.floor(spend / 20),
      totalOrders: Math.floor(spend / 350) + 1,
      organization_id: targetOrgId
    });
  }

  // 4. Synthetic Orders (100,000)
  const orderHistory = [];
  const modes = ["Cash", "UPI", "Card"];

  for (let o = 1; o <= orderCount; o++) {
    const amount = 100 + (o % 900);
    const paidAt = new Date(Date.now() - Math.floor(Math.random() * 180) * 86400000).toISOString();
    orderHistory.push({
      id: `ord_${o}`,
      source: `Table ${(o % 20) + 1}`,
      customerName: `Customer ${(o % customerCount) + 1}`,
      items: [
        { menuItemId: `m_${(o % menuCount) + 1}`, name: `Item ${(o % menuCount) + 1}`, price: amount, qty: 1 }
      ],
      subtotal: amount,
      discount: 0,
      gst: Math.round(amount * 0.05),
      grandTotal: amount + Math.round(amount * 0.05),
      paymentMode: modes[o % modes.length],
      status: "Paid",
      paidAt,
      organization_id: targetOrgId
    });
  }

  // 5. Synthetic Inventory Logs (200,000)
  const inventoryLogs = [];
  for (let l = 1; l <= inventoryLogCount; l++) {
    inventoryLogs.push({
      id: `log_${l}`,
      orderRef: `ord_${(l % orderCount) + 1}`,
      ingredientId: `inv_${(l % inventoryCount) + 1}`,
      ingredientName: `Ingredient ${(l % inventoryCount) + 1}`,
      type: "Sale",
      qty: -0.05,
      date: new Date(Date.now() - Math.floor(Math.random() * 180) * 86400000).toISOString(),
      organization_id: targetOrgId
    });
  }

  return {
    ...base,
    categories,
    menu: menuItems,
    inventory,
    customers,
    orderHistory,
    inventoryLogs,
    organization_id: targetOrgId
  };
}

/**
 * Paginate an array collection safely to prevent browser DOM overload
 * @param {Array} collection 
 * @param {number} page 
 * @param {number} pageSize 
 * @returns {object} Paginated window result
 */
export function paginateCollection(collection = [], page = 1, pageSize = 50) {
  if (!Array.isArray(collection)) return { data: [], total: 0, totalPages: 0, page, pageSize };

  const total = collection.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const data = collection.slice(startIndex, endIndex);

  return {
    data,
    total,
    totalPages,
    page: currentPage,
    pageSize
  };
}
