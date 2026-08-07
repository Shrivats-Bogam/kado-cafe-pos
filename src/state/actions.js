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

export function addTable(state, tableData) {
  const nextNumber = tableData.number ? Number(tableData.number) : (state.tables.length + 1);
  const newTable = {
    id: tableData.id || `t_${Date.now()}`,
    number: nextNumber,
    name: tableData.name || `Table ${nextNumber}`,
    capacity: Number(tableData.capacity || 4),
    type: tableData.type || "Indoor",
    shape: tableData.shape || "square",
    area: tableData.area || tableData.type || "Main Dining",
    notes: tableData.notes || "",
    qrEnabled: tableData.qrEnabled !== false,
    status: "available",
    items: [],
    customerName: "",
    startedAt: null,
    kitchenStatus: "New",
    priority: "Normal",
    priorityAt: null,
    orderHistory: [],
    openedAt: null,
    x: tableData.x ?? 0,
    y: tableData.y ?? 0,
  };
  return {
    ...state,
    tables: [...state.tables, newTable],
  };
}

export function editTable(state, tableId, patch) {
  return {
    ...state,
    tables: state.tables.map((t) => (t.id === tableId ? { ...t, ...patch } : t)),
  };
}

export function deleteTable(state, tableId) {
  return {
    ...state,
    tables: state.tables.filter((t) => t.id !== tableId),
  };
}

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

export function transferTable(state, fromTableId, toTableId) {
  const fromTable = state.tables.find((t) => t.id === fromTableId);
  if (!fromTable) return state;

  return {
    ...state,
    tables: state.tables.map((t) => {
      if (t.id === fromTableId) {
        return {
          ...t,
          status: "available",
          items: [],
          customerName: "",
          startedAt: null,
          kitchenStatus: "New",
          priority: "Normal",
          priorityAt: null,
        };
      }
      if (t.id === toTableId) {
        return {
          ...t,
          status: fromTable.items.length > 0 ? "preparing" : t.status,
          items: [...fromTable.items],
          customerName: fromTable.customerName || t.customerName,
          startedAt: fromTable.startedAt || new Date().toISOString(),
          kitchenStatus: fromTable.kitchenStatus || "New",
          priority: fromTable.priority || "Normal",
          priorityAt: fromTable.priorityAt || null,
        };
      }
      return t;
    }),
  };
}

export function mergeTables(state, sourceTableId, targetTableId) {
  const sourceTable = state.tables.find((t) => t.id === sourceTableId);
  const targetTable = state.tables.find((t) => t.id === targetTableId);
  if (!sourceTable || !targetTable) return state;

  // Combine items by menuItemId
  const mergedItems = [...targetTable.items];
  sourceTable.items.forEach((sItem) => {
    const existingIdx = mergedItems.findIndex((it) => it.menuItemId === sItem.menuItemId);
    if (existingIdx >= 0) {
      mergedItems[existingIdx] = {
        ...mergedItems[existingIdx],
        qty: mergedItems[existingIdx].qty + sItem.qty,
      };
    } else {
      mergedItems.push({ ...sItem });
    }
  });

  return {
    ...state,
    tables: state.tables.map((t) => {
      if (t.id === sourceTableId) {
        return {
          ...t,
          status: "available",
          items: [],
          customerName: "",
          startedAt: null,
          kitchenStatus: "New",
          priority: "Normal",
          priorityAt: null,
        };
      }
      if (t.id === targetTableId) {
        return {
          ...t,
          status: "preparing",
          items: mergedItems,
          customerName: targetTable.customerName || sourceTable.customerName,
          startedAt: targetTable.startedAt || sourceTable.startedAt || new Date().toISOString(),
          kitchenStatus: targetTable.kitchenStatus || "New",
          priority: sourceTable.priority === "Rush" || targetTable.priority === "Rush" ? "Rush" : "Normal",
        };
      }
      return t;
    }),
  };
}

export function splitTable(state, sourceTableId, targetTableId, itemsToMove = []) {
  const sourceTable = state.tables.find((t) => t.id === sourceTableId);
  const targetTable = state.tables.find((t) => t.id === targetTableId);
  if (!sourceTable || !targetTable || !itemsToMove.length) return state;

  const remainingSourceItems = [];
  const itemsForTarget = [...targetTable.items];

  sourceTable.items.forEach((sItem) => {
    const moveInfo = itemsToMove.find((m) => m.menuItemId === sItem.menuItemId);
    const moveQty = moveInfo ? Math.min(sItem.qty, moveInfo.qty) : 0;
    const stayQty = sItem.qty - moveQty;

    if (stayQty > 0) {
      remainingSourceItems.push({ menuItemId: sItem.menuItemId, qty: stayQty });
    }

    if (moveQty > 0) {
      const existingTIdx = itemsForTarget.findIndex((it) => it.menuItemId === sItem.menuItemId);
      if (existingTIdx >= 0) {
        itemsForTarget[existingTIdx] = {
          ...itemsForTarget[existingTIdx],
          qty: itemsForTarget[existingTIdx].qty + moveQty,
        };
      } else {
        itemsForTarget.push({ menuItemId: sItem.menuItemId, qty: moveQty });
      }
    }
  });

  return {
    ...state,
    tables: state.tables.map((t) => {
      if (t.id === sourceTableId) {
        return {
          ...t,
          items: remainingSourceItems,
          status: remainingSourceItems.length === 0 ? "available" : t.status,
          startedAt: remainingSourceItems.length === 0 ? null : t.startedAt,
          customerName: remainingSourceItems.length === 0 ? "" : t.customerName,
        };
      }
      if (t.id === targetTableId) {
        return {
          ...t,
          items: itemsForTarget,
          status: "preparing",
          startedAt: targetTable.startedAt || new Date().toISOString(),
          customerName: targetTable.customerName || sourceTable.customerName,
        };
      }
      return t;
    }),
  };
}

export function reserveTable(state, tableId, customerName = "", capacity = null) {
  return {
    ...state,
    tables: state.tables.map((t) => (t.id === tableId ? {
      ...t,
      status: "reserved",
      customerName: customerName || t.customerName || "Reserved",
      capacity: capacity ? Number(capacity) : t.capacity,
    } : t)),
  };
}

export function setTableCleaning(state, tableId) {
  return {
    ...state,
    tables: state.tables.map((t) => {
      if (t.id === tableId) {
        if (t.status === "cleaning") {
          return {
            ...t,
            status: "available",
            items: [],
            customerName: "",
            startedAt: null,
            kitchenStatus: "New",
            priority: "Normal",
          };
        }
        return {
          ...t,
          status: "cleaning",
        };
      }
      return t;
    }),
  };
}

export function duplicateTableOrder(state, sourceTableId, targetTableId) {
  const sourceTable = state.tables.find((t) => t.id === sourceTableId);
  if (!sourceTable || !sourceTable.items.length) return state;

  return {
    ...state,
    tables: state.tables.map((t) => (t.id === targetTableId ? {
      ...t,
      items: sourceTable.items.map((i) => ({ ...i })),
      customerName: sourceTable.customerName || t.customerName,
      status: "preparing",
      startedAt: new Date().toISOString(),
      kitchenStatus: "New",
      priority: sourceTable.priority || "Normal",
    } : t)),
  };
}

// --- Parcels --------------------------------------------------------------

export function createParcel(state, parcel) {
  const exists = state.parcels.some((p) => p.id === parcel.id);
  if (exists) {
    return {
      ...state,
      parcels: state.parcels.map((p) => (p.id === parcel.id ? { ...p, ...parcel } : p)),
    };
  }
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
