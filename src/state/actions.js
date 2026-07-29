// State mutation actions for the cafe app.
//
// Each exported function is a pure `(state, …args) => state` that returns the
// next state without mutating the input. `StaffApp.jsx` wires them up to its
// `setStateRaw` so callers (handlers/views) keep the same signatures they had
// before — only the location of the logic moved.
//
// Keeping them pure makes them trivially unit-testable later and removes the
// "god component" property of StaffApp, which previously held ~120 lines of
// inline business logic among its rendering concerns.
//
// IDs use `makeId()` from lib/id.js to avoid the `Date.now()` collision
// pattern the inline code used. Function behaviour is otherwise identical.

import { orderTotal } from "../lib/currency.js";
import { applyLoyalty } from "../lib/loyalty.js";
import { makeId } from "../lib/id.js";

// --- Tables ---------------------------------------------------------------

export function saveTableOrder(state, tableId, items, customerName, opts = {}) {
  const wasEmpty = state.tables.find((t) => t.id === tableId)?.items?.length === 0;
  const nextTables = state.tables.map((t) => (t.id === tableId ? {
    ...t,
    items,
    customerName,
    status: items.length === 0 ? "available" : (t.status === "available" ? "preparing" : t.status),
    startedAt: t.startedAt || (items.length > 0 ? new Date().toISOString() : null),
    kitchenStatus: wasEmpty && items.length > 0 ? "New" : t.kitchenStatus,
    priority: opts.priority || t.priority || "Normal",
    priorityAt: opts.priority === "Rush" ? new Date().toISOString() : t.priorityAt,
  } : t));
  return { ...state, tables: nextTables };
}

export function generateBillForTable(state, tableId, items, customerName, totals, paymentMode, phone, redeemedPoints) {
  const finalTotal = Math.max(0, totals.grandTotal - (redeemedPoints || 0));
  const { customers, customerId } = applyLoyalty(state.customers, phone, finalTotal, redeemedPoints || 0);
  const tableNo = state.tables.find((t) => t.id === tableId)?.number;
  return {
    ...state,
    customers,
    orderHistory: [...state.orderHistory, {
      id: makeId("o"),
      source: `Table ${tableNo}`,
      customerName,
      customerId,
      items,
      ...totals,
      grandTotal: finalTotal,
      pointsRedeemed: redeemedPoints || 0,
      paymentMode,
      paidAt: new Date().toISOString(),
    }],
    tables: state.tables.map((t) => (t.id === tableId ? {
      ...t, status: "available", items: [], customerName: "", startedAt: null,
      kitchenStatus: "New", priority: "Normal", priorityAt: null,
    } : t)),
  };
}

export function setTableStatus(state, tableId, status) {
  return {
    ...state,
    tables: state.tables.map((t) => (t.id === tableId ? {
      ...t,
      status,
      ...(status === "available" ? {
        items: [], customerName: "", startedAt: null,
        kitchenStatus: "New", priority: "Normal", priorityAt: null,
      } : {}),
    } : t)),
  };
}

export function cycleKitchen(state, kind, id, newStatus) {
  if (kind === "table") {
    return {
      ...state,
      tables: state.tables.map((t) => (t.id === id ? {
        ...t,
        kitchenStatus: newStatus,
        status: newStatus === "Served" ? t.status : "serving",
      } : t)),
    };
  }
  return { ...state, parcels: state.parcels.map((p) => (p.id === id ? { ...p, status: newStatus } : p)) };
}

export function setTablePriority(state, tableId, priority) {
  return {
    ...state,
    tables: state.tables.map((t) => (t.id === tableId ? {
      ...t,
      priority,
      priorityAt: priority === "Rush" ? new Date().toISOString() : t.priorityAt,
    } : t)),
  };
}

// --- Parcels --------------------------------------------------------------

export function createParcel(state, parcel) {
  return { ...state, parcels: [...state.parcels, parcel] };
}

export function updateParcelStatus(state, id, status) {
  const parcel = state.parcels.find((p) => p.id === id);
  if (status === "Delivered" && parcel && parcel.status !== "Delivered") {
    const totals = orderTotal(parcel.items, state.menuItems);
    const { customers, customerId } = applyLoyalty(state.customers, parcel.phone, totals.grandTotal, 0);
    return {
      ...state,
      customers,
      orderHistory: [...state.orderHistory, {
        id: makeId("o"),
        source: "Parcel",
        customerName: parcel.customerName,
        customerId,
        items: parcel.items,
        ...totals,
        pointsRedeemed: 0,
        paymentMode: parcel.paymentMethod,
        paidAt: new Date().toISOString(),
      }],
      parcels: state.parcels.map((p) => (p.id === id ? { ...p, status } : p)),
    };
  }
  return { ...state, parcels: state.parcels.map((p) => (p.id === id ? { ...p, status } : p)) };
}

export function deleteParcel(state, id) {
  return { ...state, parcels: state.parcels.filter((p) => p.id !== id) };
}

// --- Menu -----------------------------------------------------------------

export function addMenuItem(state, item) {
  return { ...state, menuItems: [...state.menuItems, item] };
}

export function editMenuItem(state, id, patch) {
  return { ...state, menuItems: state.menuItems.map((m) => (m.id === id ? { ...m, ...patch } : m)) };
}

export function deleteMenuItem(state, id) {
  return { ...state, menuItems: state.menuItems.filter((m) => m.id !== id) };
}

// --- Customers ------------------------------------------------------------

export function addCustomer(state, customer) {
  return { ...state, customers: [...state.customers, customer] };
}

export function deleteCustomer(state, id) {
  return { ...state, customers: state.customers.filter((c) => c.id !== id) };
}

// --- Users / Settings -----------------------------------------------------

export function addUser(state, user) {
  return { ...state, users: [...state.users, user] };
}

export function removeUser(state, id) {
  return { ...state, users: state.users.filter((u) => u.id !== id) };
}
