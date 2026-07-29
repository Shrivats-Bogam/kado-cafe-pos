// Default state + role config used across the app.

import { defaultMenu } from "./menu.js";

export const ROLE_TABS = {
  Owner: ["dashboard", "tables", "kitchen", "parcel", "menu", "customers", "insights", "reports", "settings"],
  Manager: ["dashboard", "tables", "kitchen", "parcel", "menu", "customers", "insights", "reports"],
  Staff: ["dashboard", "tables", "kitchen", "parcel"],
  Kitchen: ["kitchen"],
  Waiter: ["tables", "kitchen", "parcel"],
};

export const ROLE_LABELS = {
  Owner: "Owner",
  Manager: "Manager",
  Staff: "Staff",
  Kitchen: "Kitchen",
  Waiter: "Waiter",
};

export const TABLE_STATUS = {
  available: { bg: "bg-emerald-600", label: "Available", tone: "emerald" },
  preparing: { bg: "bg-amber-600", label: "Preparing", tone: "amber" },
  serving: { bg: "bg-sky-600", label: "Serving", tone: "sky" },
  payment_pending: { bg: "bg-rose-600", label: "Payment Pending", tone: "rose" },
  closed: { bg: "bg-stone-600", label: "Closed", tone: "stone" },
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

export function defaultState() {
  return {
    cafeName: "Kado Cafe",
    tables: defaultTables(),
    menuItems: defaultMenu(),
    parcels: [],
    orderHistory: [],
    customers: [],
    users: defaultUsers(),
    expenses: [],
    invites: [],
  };
}
