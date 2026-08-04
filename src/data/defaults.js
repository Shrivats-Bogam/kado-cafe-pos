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
