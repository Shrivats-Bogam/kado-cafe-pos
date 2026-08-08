// Default state + role config used across the app.

import { defaultMenu } from "./menu.js";

export const ROLE_TABS = {
  Owner: ["dashboard", "tables", "kitchen", "parcel", "menu", "customers", "insights", "reports", "employees", "settings"],
  Manager: ["dashboard", "tables", "kitchen", "parcel", "menu", "customers", "insights", "reports", "employees"],
  Staff: ["dashboard", "tables", "kitchen", "parcel"],
  Kitchen: ["kitchen"],
  Waiter: ["tables", "kitchen", "parcel"],
  Cashier: ["dashboard", "tables", "kitchen", "parcel"],
};

export const ROLE_LABELS = {
  Owner: "Owner",
  Manager: "Manager",
  Staff: "Staff",
  Kitchen: "Kitchen",
  Waiter: "Waiter",
};

export const TABLE_STATUS = {
  available: { bg: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500/30", badgeBg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", label: "Available", tone: "emerald" },
  ordering: { bg: "bg-amber-500", text: "text-amber-400", border: "border-amber-500/30", badgeBg: "bg-amber-500/15 text-amber-400 border-amber-500/30", label: "Ordering", tone: "amber" },
  preparing: { bg: "bg-sky-500", text: "text-sky-400", border: "border-sky-500/30", badgeBg: "bg-sky-500/15 text-sky-400 border-sky-500/30", label: "Preparing", tone: "sky" },
  serving: { bg: "bg-sky-500", text: "text-sky-400", border: "border-sky-500/30", badgeBg: "bg-sky-500/15 text-sky-400 border-sky-500/30", label: "Preparing", tone: "sky" },
  ready: { bg: "bg-purple-500", text: "text-purple-400", border: "border-purple-500/30", badgeBg: "bg-purple-500/15 text-purple-400 border-purple-500/30", label: "Ready", tone: "purple" },
  billing: { bg: "bg-rose-500", text: "text-rose-400", border: "border-rose-500/30", badgeBg: "bg-rose-500/15 text-rose-400 border-rose-500/30", label: "Billing", tone: "rose" },
  payment_pending: { bg: "bg-rose-500", text: "text-rose-400", border: "border-rose-500/30", badgeBg: "bg-rose-500/15 text-rose-400 border-rose-500/30", label: "Billing", tone: "rose" },
  reserved: { bg: "bg-yellow-500", text: "text-yellow-400", border: "border-yellow-500/30", badgeBg: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", label: "Reserved", tone: "yellow" },
  cleaning: { bg: "bg-stone-500", text: "text-stone-400", border: "border-stone-500/30", badgeBg: "bg-stone-500/15 text-stone-400 border-stone-500/30", label: "Cleaning", tone: "stone" },
  closed: { bg: "bg-stone-600", text: "text-stone-400", border: "border-stone-600/30", badgeBg: "bg-stone-600/15 text-stone-400 border-stone-600/30", label: "Closed", tone: "stone" },
};

export const KITCHEN_STATES = ["New", "Cooking", "Ready", "Served"];

export const PARCEL_STATUSES = ["Preparing", "Ready", "Delivered", "Cancelled"];

export function defaultTables(count = 7) {
  return Array.from({ length: count }, (_, i) => ({
    id: `t${i + 1}`,
    number: i + 1,
    status: "available",
    items: [], // [{ menuItemId, qty }]
    customerName: "",
    startedAt: null,
    kitchenStatus: "New",
    capacity: (i % 3 === 0) ? 2 : (i % 3 === 1) ? 4 : 6,
    qrEnabled: true,
  }));
}

// One default Owner so the login screen isn't empty on a fresh install.
// You can add more team members later from Settings → Team.
export function defaultUsers() {
  return [
    { id: "u_owner", name: "Owner", pin: "1234", role: "Owner" },
    { id: "u_manager", name: "Manager", pin: "0000", role: "Manager" },
  ];
}

export function defaultInventory() {
  return [
    { id: "inv_1", name: "Milk", category: "Dairy", unit: "litre", currentStock: 20, minStock: 5, costPrice: 60, supplier: "Amul Dairy", notes: "Fresh whole milk" },
    { id: "inv_2", name: "Tea Leaves", category: "Beverages", unit: "g", currentStock: 800, minStock: 200, costPrice: 0.5, supplier: "Assam Tea Traders", notes: "Premium CTC tea" },
    { id: "inv_3", name: "Sugar", category: "Pantry", unit: "g", currentStock: 2500, minStock: 500, costPrice: 0.04, supplier: "Local Grocer", notes: "Fine white sugar" },
    { id: "inv_4", name: "Espresso Coffee Beans", category: "Beverages", unit: "kg", currentStock: 4, minStock: 1, costPrice: 850, supplier: "Blue Tokai Roasters", notes: "Dark roast blend" },
    { id: "inv_5", name: "Burger Buns", category: "Bakery", unit: "pcs", currentStock: 30, minStock: 10, costPrice: 12, supplier: "Fresh Bake Co", notes: "Sesame buns" },
    { id: "inv_6", name: "Veggie Patty", category: "Frozen", unit: "pcs", currentStock: 25, minStock: 8, costPrice: 25, supplier: "McCain Foods", notes: "Crispy veg patties" },
    { id: "inv_7", name: "Cheese Slices", category: "Dairy", unit: "pcs", currentStock: 40, minStock: 10, costPrice: 8, supplier: "Amul Dairy", notes: "Processed cheese slices" },
    { id: "inv_8", name: "Sauce & Mayo", category: "Condiments", unit: "ml", currentStock: 1500, minStock: 300, costPrice: 0.15, supplier: "Heinz India", notes: "Burger sauce mix" },
  ];
}

export function defaultRecipes() {
  return {
    "m1": [ // Masala Tea
      { ingredientId: "inv_1", qty: 150 }, // 150 ml Milk
      { ingredientId: "inv_2", qty: 8 },   // 8 g Tea
      { ingredientId: "inv_3", qty: 10 },  // 10 g Sugar
    ],
    "m2": [ // Espresso / Coffee
      { ingredientId: "inv_4", qty: 0.018 }, // 18 g Coffee beans (0.018 kg)
    ],
    "m3": [ // Veg Burger
      { ingredientId: "inv_5", qty: 1 },  // 1 Bun
      { ingredientId: "inv_6", qty: 1 },  // 1 Patty
      { ingredientId: "inv_7", qty: 1 },  // 1 Cheese slice
      { ingredientId: "inv_8", qty: 15 }, // 15 ml Sauce
    ]
  };
}

export function defaultCustomers() {
  const today = new Date();
  const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().slice(5, 10); // MM-DD
  const nextWeekStr = new Date(today.getTime() + 3 * 86400000).toISOString().slice(5, 10);

  return [
    {
      id: "c1",
      name: "Rahul Sharma",
      phone: "9876543210",
      email: "rahul.s@example.com",
      birthday: `${today.getFullYear()}-${tomorrowStr}`, // Birthday tomorrow!
      anniversary: "2020-11-20",
      address: "Bandra West, Mumbai",
      membership: "Platinum",
      points: 520,
      lifetimeSpend: 54200,
      totalOrders: 28,
      lastVisit: new Date().toISOString(),
      notes: "VIP Guest. Likes extra shot espresso in cappuccino."
    },
    {
      id: "c2",
      name: "Priya Patel",
      phone: "9812345678",
      email: "priya.p@example.com",
      birthday: `${today.getFullYear()}-${nextWeekStr}`,
      anniversary: "",
      address: "Andheri East, Mumbai",
      membership: "Gold",
      points: 210,
      lifetimeSpend: 21500,
      totalOrders: 14,
      lastVisit: new Date(Date.now() - 2 * 86400000).toISOString(),
      notes: "Prefers oat milk for beverages."
    },
    {
      id: "c3",
      name: "Amit Verma",
      phone: "9988776655",
      email: "amit.v@example.com",
      birthday: "1995-04-12",
      anniversary: "2022-02-14",
      address: "Juhu, Mumbai",
      membership: "Silver",
      points: 85,
      lifetimeSpend: 4200,
      totalOrders: 5,
      lastVisit: new Date(Date.now() - 5 * 86400000).toISOString(),
      notes: "Orders takeaway on weekends."
    }
  ];
}

export function defaultEmployees() {
  return [
    {
      id: "emp_1",
      employeeId: "EMP-101",
      name: "Alex Morgan",
      phone: "9876543210",
      email: "alex@kadocafe.com",
      role: "Owner",
      department: "Management",
      pin: "1234",
      status: "active",
      joinedAt: "2024-01-15",
    },
    {
      id: "emp_2",
      employeeId: "EMP-102",
      name: "Sarah Jenkins",
      phone: "9812345678",
      email: "sarah@kadocafe.com",
      role: "Manager",
      department: "Operations",
      pin: "0000",
      status: "active",
      joinedAt: "2024-02-01",
    },
    {
      id: "emp_3",
      employeeId: "EMP-103",
      name: "David Kim",
      phone: "9765432109",
      email: "david@kadocafe.com",
      role: "Kitchen",
      department: "Kitchen",
      pin: "5555",
      status: "active",
      joinedAt: "2024-03-10",
    },
    {
      id: "emp_4",
      employeeId: "EMP-104",
      name: "Emily Watson",
      phone: "9654321098",
      email: "emily@kadocafe.com",
      role: "Waiter",
      department: "Service",
      pin: "1111",
      status: "active",
      joinedAt: "2024-04-05",
    }
  ];
}

export function defaultRolePermissions() {
  return {
    Owner: { tables: true, parcel: true, kitchen: true, menu: true, customers: true, insights: true, reports: true, inventory: true, employees: true, settings: true },
    Manager: { tables: true, parcel: true, kitchen: true, menu: true, customers: true, insights: true, reports: true, inventory: true, employees: true, settings: false },
    Cashier: { tables: true, parcel: true, kitchen: true, menu: false, customers: true, insights: false, reports: false, inventory: false, employees: false, settings: false },
    Staff: { tables: true, parcel: true, kitchen: true, menu: false, customers: false, insights: false, reports: false, inventory: false, employees: false, settings: false },
    Waiter: { tables: true, parcel: true, kitchen: true, menu: false, customers: false, insights: false, reports: false, inventory: false, employees: false, settings: false },
    Kitchen: { tables: false, parcel: false, kitchen: true, menu: false, customers: false, insights: false, reports: false, inventory: false, employees: false, settings: false },
  };
}

export function defaultSettings() {
  return {
    // General & Business Profile
    businessName: "Kado Cafe",
    phone: "9876543210",
    email: "owner@kadocafe.com",
    address: "123 Cafe Street, Bandra West, Mumbai, Maharashtra 400050",
    gstin: "27AAAAA0000A1Z5",
    logoUrl: "",
    currency: "INR ₹",
    timezone: "Asia/Kolkata",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12h",

    // Billing & Tax
    gstEnabled: true,
    gstRate: 5,
    taxExclusive: false,
    roundingMethod: "round",
    allowDiscounts: true,
    requireDiscountApproval: false,

    // Receipts
    receiptWidth: "80mm",
    showLogoOnReceipt: true,
    showAddressOnReceipt: true,
    showGstinOnReceipt: true,
    receiptFooter: "Thank you for visiting Kado Cafe! Please come again.",
    autoPrintAfterPayment: false,

    // Table Defaults
    tableSections: ["Indoor", "Outdoor", "Terrace", "Bar"],
    defaultTableCapacity: 4,
    seatingIconsEnabled: true,

    // Kitchen KDS
    kitchenDisplayMode: "grid",
    soundAlertsEnabled: true,
    attentionThresholdMins: 15,
    urgentThresholdMins: 30,

    // Menu Preferences
    showUnavailableItemsToStaff: true,
    showUnavailableItemsToCustomers: false,
    defaultMenuCategory: "All",

    // Inventory Safety
    defaultMinStockThreshold: 5,
    stockWarningNotify: true,

    // CRM & Loyalty Rules
    phoneValidationEnabled: true,
    preventDuplicateCustomers: true,
    birthdayRemindersEnabled: true,
    loyaltyEarnRate: 20,
    loyaltyRedeemValue: 0.5,
    silverThreshold: 0,
    goldThreshold: 10000,
    platinumThreshold: 50000,

    // Data & Export
    dataExportFormat: "csv",
    autoBackupEnabled: false,
  };
}

export function defaultState() {
  return {
    cafeName: "Kado Cafe",
    settings: defaultSettings(),
    tables: defaultTables(),
    menuItems: defaultMenu(),
    parcels: [],
    orderHistory: [],
    customers: defaultCustomers(),
    users: defaultUsers(),
    employees: defaultEmployees(),
    rolePermissions: defaultRolePermissions(),
    shifts: [],
    activityLogs: [
      { id: "log_1", employeeName: "Alex Morgan", action: "Logged in", module: "Auth", timestamp: new Date().toISOString() }
    ],
    assistanceRequests: [],
    customerFeedback: [],
    expenses: [],
    invites: [],
    inventory: defaultInventory(),
    recipes: defaultRecipes(),
    inventoryLogs: [],
  };
}
