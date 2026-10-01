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
import { 
  applyLoyalty, 
  evaluateCustomerTier, 
  autoPromoteCustomerTiers, 
  expireInactiveCustomerPoints, 
  calculateMembershipTier 
} from "../lib/loyalty.js";
import { makeId } from "../lib/id.js";

// --- Tables ---------------------------------------------------------------

export function saveTableOrder(state, tableId, items, customerName, opts = {}) {
  const nextTables = state.tables.map((t) => {
    if (t.id !== tableId) return t;

    const newPriority = opts.priority || t.priority || "Normal";
    const orderNotes = opts.orderNotes !== undefined ? opts.orderNotes : (t.orderNotes || "");

    // Calculate item quantities already sent to kitchen across previous tickets
    const sentQtyMap = {};
    (t.kitchenTickets || []).forEach((ticket) => {
      (ticket.items || []).forEach((it) => {
        sentQtyMap[it.menuItemId] = (sentQtyMap[it.menuItemId] || 0) + it.qty;
      });
    });

    // Determine delta items (new items or quantity increases)
    const deltaItems = [];
    items.forEach((it) => {
      const sentQty = sentQtyMap[it.menuItemId] || 0;
      const diffQty = it.qty - sentQty;
      if (diffQty > 0) {
        deltaItems.push({
          menuItemId: it.menuItemId,
          qty: diffQty,
          notes: it.notes || ""
        });
      }
    });

    // Update existing tickets priority if Rush status changed
    let updatedTickets = (t.kitchenTickets || []).map((ticket) => ({
      ...ticket,
      priority: newPriority,
    }));

    // Create a new kitchen ticket if there are delta items
    if (deltaItems.length > 0) {
      const newTicket = {
        id: makeId("kt"),
        tableId: t.id,
        tableNumber: t.number,
        customerName: customerName || t.customerName || `Table ${t.number}`,
        items: deltaItems,
        notes: orderNotes,
        status: "New",
        createdAt: new Date().toISOString(),
        priority: newPriority,
      };
      updatedTickets.push(newTicket);
    } else if (items.length === 0) {
      updatedTickets = [];
    }

    const activeTickets = updatedTickets.filter((ticket) => ticket.status !== "Served");
    const nextKitchenStatus = activeTickets.length > 0 ? activeTickets[activeTickets.length - 1].status : (items.length > 0 ? "Served" : "New");

    return {
      ...t,
      items,
      customerName,
      orderNotes,
      status: items.length === 0 ? "available" : (t.status === "available" ? "preparing" : t.status),
      startedAt: t.startedAt || (items.length > 0 ? new Date().toISOString() : null),
      kitchenTickets: updatedTickets,
      kitchenStatus: nextKitchenStatus,
      priority: newPriority,
      priorityAt: newPriority === "Rush" ? (t.priorityAt || new Date().toISOString()) : null,
    };
  });
  return { ...state, tables: nextTables };
}

export function generateBillForTable(state, tableId, items, customerName, totals, paymentMode, phone, redeemedPoints, serverTxResult = null) {
  const targetTable = (state.tables || []).find((t) => t.id === tableId);
  if (!targetTable || targetTable.status === "available") {
    // CONCURRENCY GUARD: Table has already been closed or billed by another client
    return state;
  }

  const billId = serverTxResult?.order_id || makeId("o");
  const finalTotal = Math.max(0, totals.grandTotal - (redeemedPoints || 0));
  const isPending = paymentMode === "Pending";
  const status = isPending ? "PENDING" : "Paid";

  const { customers, customerId } = applyLoyalty(state.customers, phone, finalTotal, redeemedPoints || 0, state.settings || {}, billId, state.orderHistory || []);
  const tableNo = targetTable.number;

  // Deduct inventory stock ONLY if payment is completed (not Pending)
  let nextInventory = state.inventory || [];
  let nextLogs = state.inventoryLogs || [];
  if (!isPending) {
    const deducted = deductStockForOrderItems(nextInventory, state.recipes || {}, nextLogs, items, billId);
    nextInventory = deducted.inventory;
    nextLogs = deducted.inventoryLogs;
  }

  const newOrderRecord = {
    id: billId,
    source: `Table ${tableNo}`,
    customerName,
    customerId,
    items,
    ...totals,
    grandTotal: finalTotal,
    pointsRedeemed: redeemedPoints || 0,
    paymentMode,
    status,
    serverConfirmed: Boolean(serverTxResult?.success),
    ledgerId: serverTxResult?.ledger_id || null,
    paidAt: isPending ? null : new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  const newPaymentRecord = isPending ? null : {
    id: serverTxResult?.payment_id || `pay_${billId}`,
    orderId: billId,
    amount: finalTotal,
    mode: paymentMode,
    status: "completed",
    ledgerId: serverTxResult?.ledger_id || null,
    idempotencyKey: serverTxResult?.idempotency_key || null,
    createdAt: new Date().toISOString(),
  };

  return {
    ...state,
    customers,
    inventory: nextInventory,
    inventoryLogs: nextLogs,
    // Local-only arrays (stripped from cloud blob to prevent unbounded growth and payload bloat)
    orders: [...(state.orders || []).filter(o => o.id !== billId), newOrderRecord],
    payments: newPaymentRecord ? [...(state.payments || []).filter(p => p.id !== newPaymentRecord.id), newPaymentRecord] : (state.payments || []),
    orderHistory: [...(state.orderHistory || []).filter(o => o.id !== billId), newOrderRecord],
    tables: state.tables.map((t) => (t.id === tableId ? {
      ...t,
      status: "available",
      items: [],
      kitchenTickets: [],
      customerName: "",
      orderNotes: "",
      startedAt: null,
      kitchenStatus: "New",
      priority: "Normal",
      priorityAt: null,
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
        items: [],
        kitchenTickets: [],
        customerName: "",
        orderNotes: "",
        startedAt: null,
        kitchenStatus: "New",
        priority: "Normal",
        priorityAt: null,
      } : {}),
    } : t)),
  };
}

export function cycleKitchen(state, kind, id, newStatus) {
  if (kind === "table") {
    return {
      ...state,
      tables: state.tables.map((t) => {
        const hasTicket = (t.kitchenTickets || []).some((ticket) => ticket.id === id);
        if (hasTicket) {
          const updatedTickets = t.kitchenTickets.map((ticket) => (
            ticket.id === id ? { ...ticket, status: newStatus } : ticket
          ));
          const activeTickets = updatedTickets.filter((ticket) => ticket.status !== "Served");
          const nextKitchenStatus = activeTickets.length > 0 ? activeTickets[activeTickets.length - 1].status : "Served";

          return {
            ...t,
            kitchenTickets: updatedTickets,
            kitchenStatus: nextKitchenStatus,
            status: nextKitchenStatus === "Served" ? t.status : "serving",
          };
        } else if (t.id === id) {
          const updatedTickets = (t.kitchenTickets || []).map((ticket) => (
            ticket.status !== "Served" ? { ...ticket, status: newStatus } : ticket
          ));
          return {
            ...t,
            kitchenTickets: updatedTickets,
            kitchenStatus: newStatus,
            status: newStatus === "Served" ? t.status : "serving",
          };
        }
        return t;
      }),
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
  if (!sourceTable || !sourceTable.items || sourceTable.items.length === 0) return state;

  return {
    ...state,
    tables: state.tables.map((t) => {
      if (t.id === targetTableId) {
        return {
          ...t,
          status: "preparing",
          items: [...sourceTable.items],
          customerName: sourceTable.customerName || t.customerName,
          orderNotes: sourceTable.orderNotes || t.orderNotes || "",
          startedAt: new Date().toISOString(),
          kitchenStatus: sourceTable.kitchenStatus || "New",
          priority: sourceTable.priority || "Normal",
          priorityAt: sourceTable.priorityAt || null,
        };
      }
      return t;
    }),
  };
}

export function addTable(state, table) {
  const newTable = {
    id: table.id || `t_${Date.now()}`,
    number: Number(table.number || state.tables.length + 1),
    name: table.name || `Table ${table.number}`,
    capacity: Number(table.capacity || 4),
    type: table.type || table.area || "Indoor",
    area: table.area || table.type || "Indoor",
    shape: table.shape || "square",
    qrEnabled: table.qrEnabled !== false,
    notes: table.notes || "",
    status: "available",
    items: [],
    kitchenTickets: [],
    customerName: "",
    orderNotes: "",
    startedAt: null,
    kitchenStatus: "New",
    priority: "Normal",
    priorityAt: null,
    x: table.x ?? (Number(table.number || state.tables.length + 1) % 4) * 180 + 20,
    y: table.y ?? Math.floor(Number(table.number || state.tables.length + 1) / 4) * 160 + 20,
  };
  const filteredTables = (state.tables || []).filter(t => t.id !== newTable.id && Number(t.number) !== Number(newTable.number));
  return { ...state, tables: [...filteredTables, newTable] };
}

export function editTable(state, tableId, patch) {
  return {
    ...state,
    tables: state.tables.map((t) => (t.id === tableId ? { ...t, ...patch } : t)),
  };
}

export function archiveTable(state, tableId) {
  return {
    ...state,
    tables: (state.tables || []).map((t) => (t.id === tableId ? { ...t, status: "archived" } : t)),
  };
}

export function deleteTable(state, tableId) {
  return archiveTable(state, tableId);
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

// --- Menu & Categories ---------------------------------------------------

export function addMenuItem(state, item) {
  const newItem = {
    id: item.id || `m_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: item.name,
    category: item.category || "General",
    price: Number(item.price) || 0,
    available: item.available !== undefined ? item.available : true,
    description: item.description || "",
    isVeg: item.isVeg !== undefined ? item.isVeg : true,
    displayOrder: item.displayOrder || (state.menuItems || []).length + 1,
  };
  return { ...state, menuItems: [...(state.menuItems || []), newItem] };
}

export function editMenuItem(state, id, patch) {
  return {
    ...state,
    menuItems: (state.menuItems || []).map((m) => (m.id === id ? { ...m, ...patch } : m)),
  };
}

export function deleteMenuItem(state, id) {
  return {
    ...state,
    menuItems: (state.menuItems || []).filter((m) => m.id !== id),
  };
}

export function duplicateMenuItem(state, id) {
  const target = (state.menuItems || []).find((m) => m.id === id);
  if (!target) return state;
  const newItem = {
    ...target,
    id: `m_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: `${target.name} Copy`,
    displayOrder: (target.displayOrder || 0) + 1,
  };
  return { ...state, menuItems: [...(state.menuItems || []), newItem] };
}

export function reorderMenuItems(state, newMenuItems) {
  return { ...state, menuItems: newMenuItems };
}

export function addCategory(state, catName) {
  const name = catName ? catName.trim() : "";
  if (!name) return state;
  const currentCats = state.categories || [];
  if (currentCats.includes(name)) return state;
  return { ...state, categories: [...currentCats, name] };
}

export function editCategory(state, oldName, newName) {
  const cleanNewName = newName ? newName.trim() : "";
  if (!cleanNewName || oldName === cleanNewName) return state;
  const currentCats = state.categories || [];
  const nextCats = currentCats.map((c) => (c === oldName ? cleanNewName : c));
  const nextItems = (state.menuItems || []).map((m) =>
    m.category === oldName ? { ...m, category: cleanNewName } : m
  );
  return { ...state, categories: nextCats, menuItems: nextItems };
}

export function deleteCategory(state, catName) {
  const currentCats = state.categories || [];
  const nextCats = currentCats.filter((c) => c !== catName);
  return { ...state, categories: nextCats };
}

export function reorderCategories(state, newCategories) {
  return { ...state, categories: newCategories };
}

export function addCustomer(state, customer) {
  const prepared = evaluateCustomerTier(
    {
      ...customer,
      points: Number(customer.points) || 0,
      lifetimeSpend: Number(customer.lifetimeSpend) || 0,
      totalOrders: Number(customer.totalOrders) || 0,
      totalVisits: Number(customer.totalVisits || customer.totalOrders) || 0,
      createdAt: customer.createdAt || new Date().toISOString(),
      lastVisit: customer.lastVisit || new Date().toISOString(),
    },
    state.settings
  );

  // Prevent duplicate customers by phone
  const existing = (state.customers || []).find((c) => c.phone && c.phone === prepared.phone);
  if (existing) {
    const merged = evaluateCustomerTier(
      {
        ...existing,
        ...prepared,
        lifetimeSpend: (existing.lifetimeSpend || 0) + (prepared.lifetimeSpend || 0),
        points: (existing.points || 0) + (prepared.points || 0),
      },
      state.settings
    );
    return {
      ...state,
      customers: state.customers.map((c) => (c.id === existing.id ? merged : c)),
    };
  }
  return { ...state, customers: [...(state.customers || []), prepared] };
}

export function editCustomer(state, id, patch) {
  return {
    ...state,
    customers: (state.customers || []).map((c) => {
      if (c.id !== id) return c;
      const merged = { ...c, ...patch };
      // Auto-evaluate tier if lifetimeSpend is modified or patch doesn't specify membership
      return evaluateCustomerTier(merged, state.settings);
    }),
  };
}

export function deleteCustomer(state, id) {
  return { ...state, customers: (state.customers || []).filter((c) => c.id !== id) };
}

/**
 * Re-evaluates customer tiers and automatically expires inactive loyalty points.
 * Emits an activity log if promotions or point expirations occurred.
 */
export function recalculateCustomerLoyalty(state, opts = {}) {
  const settings = state.settings || {};
  const { customers: promotedList, promotedCount } = autoPromoteCustomerTiers(state.customers || [], settings);
  const { customers: finalCustomers, totalExpiredPoints, expiredCount } = expireInactiveCustomerPoints(
    promotedList,
    settings,
    opts.now || new Date()
  );

  const logs = [...(state.activityLogs || [])];
  if (promotedCount > 0 || expiredCount > 0) {
    logs.unshift({
      id: makeId("log"),
      employeeName: opts.staffName || "System",
      action: "Loyalty Audit",
      module: "CRM",
      details: `Loyalty audit completed: ${promotedCount} customer tier promotion(s), ${totalExpiredPoints} inactive points expired across ${expiredCount} account(s).`,
      timestamp: new Date().toISOString(),
    });
  }

  return {
    ...state,
    customers: finalCustomers,
    activityLogs: logs.slice(0, 100),
  };
}

/**
 * Sweeps the customer pool for loyalty points that have exceeded the inactivity window.
 */
export function expireCustomerPoints(state, opts = {}) {
  const { customers, totalExpiredPoints, expiredCount } = expireInactiveCustomerPoints(
    state.customers || [],
    state.settings || {},
    opts.now || new Date()
  );

  if (expiredCount === 0) return state;

  const logs = [...(state.activityLogs || [])];
  logs.unshift({
    id: makeId("log"),
    employeeName: opts.staffName || "System",
    action: "Points Expired",
    module: "CRM",
    details: `Auto-expired ${totalExpiredPoints} points for ${expiredCount} inactive customer profile(s).`,
    timestamp: new Date().toISOString(),
  });

  return {
    ...state,
    customers,
    activityLogs: logs.slice(0, 100),
  };
}

// --- Users / Settings -----------------------------------------------------

export function addUser(state, user) {
  return { ...state, users: [...state.users, user] };
}

export function removeUser(state, id) {
  return { ...state, users: state.users.filter((u) => u.id !== id) };
}

/**
 * Normalizes recipe ingredient quantities to stock inventory units.
 * Supports:
 * - Volume: ml <-> litre (1 litre = 1000 ml)
 * - Weight: g <-> kg (1 kg = 1000 g)
 * - Count: pcs, unit, pack, can, bottle
 * Includes smart cafe heuristic: If stock is in 'litre' and qty >= 10,
 * it safely interprets portion as ml (e.g. 150 ml per tea instead of 150 litres).
 * If stock is in 'kg' and qty >= 5, it safely interprets portion as grams (e.g. 10 g sugar).
 */
export function convertRecipeUnitToStockUnit(qty, recipeUnit, stockUnit) {
  const numQty = Number(qty) || 0;
  if (numQty <= 0) return 0;

  const from = String(recipeUnit || "").toLowerCase().trim();
  const to = String(stockUnit || "").toLowerCase().trim();

  if (from === to && from !== "") return numQty;

  // Volume: ml -> litre
  if ((from === "ml" || from === "millilitre" || from === "milliliter") && 
      (to === "litre" || to === "liter" || to === "l")) {
    return numQty / 1000;
  }
  // Volume: litre -> ml
  if ((from === "litre" || from === "liter" || from === "l") && 
      (to === "ml" || to === "millilitre" || to === "milliliter")) {
    return numQty * 1000;
  }

  // Weight: g -> kg
  if ((from === "g" || from === "gm" || from === "gram" || from === "grams") && 
      (to === "kg" || to === "kilogram" || to === "kilograms")) {
    return numQty / 1000;
  }
  // Weight: kg -> g
  if ((to === "g" || to === "gm" || to === "gram" || to === "grams") && 
      (from === "kg" || from === "kilogram" || from === "kilograms")) {
    return numQty * 1000;
  }

  // Intelligent fallback for legacy recipes without explicit recipeUnit:
  // If stock is in litre and portion size is >= 10, user entered ml
  if ((to === "litre" || to === "liter" || to === "l") && numQty >= 10 && !from) {
    return numQty / 1000;
  }
  // If stock is in kg and portion size is >= 5, user entered grams
  if ((to === "kg" || to === "kilogram" || to === "kilograms") && numQty >= 5 && !from) {
    return numQty / 1000;
  }

  return numQty;
}

// Helper: Deduct stock automatically based on item recipes with unit conversion
export function deductStockForOrderItems(inventory = [], recipes = {}, inventoryLogs = [], items = [], orderId = "") {
  let nextInventory = [...(inventory || [])];
  let nextLogs = [...(inventoryLogs || [])];

  // IDEMPOTENCY GUARD: Skip duplicate inventory deductions for the same order reference
  if (orderId && nextLogs.some((l) => (l.orderRef === orderId || l.orderId === orderId) && String(l.type).toUpperCase() === "SALE")) {
    return { inventory: nextInventory, inventoryLogs: nextLogs };
  }

  items.forEach((item) => {
    const menuItemId = item.menuItemId;
    const itemQty = item.qty || 1;
    const recipe = recipes ? recipes[menuItemId] : null;

    if (recipe && Array.isArray(recipe) && recipe.length > 0) {
      recipe.forEach((req) => {
        const invIdx = nextInventory.findIndex((i) => i.id === req.ingredientId || i.name === req.ingredientName);
        if (invIdx >= 0) {
          const invItem = nextInventory[invIdx];
          // Convert recipe portion (e.g. 150 ml) to stock unit (e.g. 0.15 litre)
          const singlePortionInStockUnit = convertRecipeUnitToStockUnit(req.qty, req.unit, invItem.unit);
          const totalDeduction = Math.round(singlePortionInStockUnit * itemQty * 1000) / 1000;

          const currentQty = typeof invItem.qty === "number" ? invItem.qty : (typeof invItem.currentStock === "number" ? invItem.currentStock : 50);
          const updatedStock = Math.max(0, Math.round((currentQty - totalDeduction) * 1000) / 1000);
          
          nextInventory[invIdx] = {
            ...invItem,
            qty: updatedStock,
            currentStock: updatedStock
          };

          const timestamp = new Date().toISOString();
          const refText = `Order #${String(orderId).slice(-6)} (${item.name || "Item"} x${itemQty})`;
          const portionText = req.unit && req.unit !== invItem.unit 
            ? `${req.qty * itemQty} ${req.unit} (${totalDeduction} ${invItem.unit})` 
            : `${totalDeduction} ${invItem.unit}`;

          nextLogs.unshift({
            id: makeId("log"),
            organization_id: "00000000-0000-0000-0000-000000000001",
            inventory_item_id: invItem.id,
            inventory_item_name: invItem.name,
            ingredientId: invItem.id,
            ingredientName: invItem.name,
            type: "SALE",
            orderRef: orderId,
            orderId: orderId,
            qty_change: -totalDeduction,
            changeQty: -totalDeduction,
            reason: `Sale deduction for ${refText}: -${portionText}`,
            timestamp,
            createdAt: timestamp
          });
        }
      });
    }
  });

  return { inventory: nextInventory, inventoryLogs: nextLogs };
}

export function createBill(state, billData, serverTxResult = null) {
  const { customers, customerId } = applyLoyalty(
    state.customers,
    billData.phone,
    billData.grandTotal,
    billData.pointsRedeemed,
    state.settings,
    billData.id,
    state.orderHistory
  );

  const billId = serverTxResult?.order_id || billData.id || makeId("o");
  const newBill = {
    id: billId,
    source: billData.source || "POS Order",
    customerName: billData.customerName || "Walk-in",
    customerId,
    items: billData.items || [],
    subtotal: billData.subtotal || 0,
    discount: billData.discount || 0,
    discountReason: billData.discountReason || "",
    gst: billData.gst || 0,
    roundOff: billData.roundOff || 0,
    grandTotal: billData.grandTotal || 0,
    pointsRedeemed: billData.pointsRedeemed || 0,
    paymentMode: billData.paymentMode || "Cash",
    paymentBreakdown: billData.paymentBreakdown || null,
    status: billData.status || "Paid",
    serverConfirmed: Boolean(serverTxResult?.success),
    ledgerId: serverTxResult?.ledger_id || null,
    paidAt: billData.paidAt || new Date().toISOString(),
  };

  const newPaymentRecord = billData.status === "Pending" ? null : {
    id: serverTxResult?.payment_id || `pay_${billId}`,
    orderId: billId,
    amount: billData.grandTotal,
    mode: billData.paymentMode || "Cash",
    status: "completed",
    ledgerId: serverTxResult?.ledger_id || null,
    idempotencyKey: serverTxResult?.idempotency_key || null,
    createdAt: new Date().toISOString(),
  };

  // Deduct inventory if bill status is Paid
  let nextInventory = state.inventory || [];
  let nextLogs = state.inventoryLogs || [];

  if (newBill.status === "Paid") {
    const deducted = deductStockForOrderItems(nextInventory, state.recipes, nextLogs, newBill.items, billId);
    nextInventory = deducted.inventory;
    nextLogs = deducted.inventoryLogs;
  }

  return {
    ...state,
    customers,
    inventory: nextInventory,
    inventoryLogs: nextLogs,
    payments: newPaymentRecord ? [...(state.payments || []).filter(p => p.id !== newPaymentRecord.id), newPaymentRecord] : (state.payments || []),
    orderHistory: [newBill, ...(state.orderHistory || [])]
  };
}

export function updateBillStatus(state, billId, newStatus) {
  let nextInventory = state.inventory || [];
  let nextLogs = state.inventoryLogs || [];

  const nextHistory = (state.orderHistory || []).map((b) => {
    if (b.id === billId) {
      if (b.status === newStatus) return b;
      // If transition from Pending -> Paid, deduct stock
      if (b.status !== "Paid" && newStatus === "Paid") {
        const deducted = deductStockForOrderItems(nextInventory, state.recipes, nextLogs, b.items || [], billId);
        nextInventory = deducted.inventory;
        nextLogs = deducted.inventoryLogs;
      }
      return { ...b, status: newStatus };
    }
    return b;
  });

  return {
    ...state,
    inventory: nextInventory,
    inventoryLogs: nextLogs,
    orderHistory: nextHistory
  };
}

export function generatePendingBill(state, pendingData) {
  const billId = pendingData.id || makeId("pb");
  const newPendingBill = {
    id: billId,
    tableId: pendingData.tableId || null,
    source: pendingData.source || "POS Order",
    customerName: pendingData.customerName || "Walk-in",
    items: pendingData.items || [],
    subtotal: pendingData.subtotal || 0,
    discount: pendingData.discount || 0,
    gst: pendingData.gst || 0,
    grandTotal: pendingData.grandTotal || 0,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  return {
    ...state,
    pendingBills: [newPendingBill, ...(state.pendingBills || []).filter(b => b.id !== billId)]
  };
}

export function payPendingBill(state, pendingBillId, paymentMode = "Cash", splitBreakdown = null, serverTxResult = null) {
  const pendingBill = (state.pendingBills || []).find(b => b.id === pendingBillId);
  if (!pendingBill) return state;

  const paidBill = {
    ...pendingBill,
    status: "Paid",
    paymentMode: Array.isArray(splitBreakdown) ? "Split" : paymentMode,
    paymentBreakdown: Array.isArray(splitBreakdown) ? splitBreakdown : [{ method: paymentMode, amount: pendingBill.grandTotal }],
    serverConfirmed: Boolean(serverTxResult?.success),
    ledgerId: serverTxResult?.ledger_id || null,
    paidAt: new Date().toISOString(),
  };

  const newPaymentRecord = {
    id: serverTxResult?.payment_id || `pay_${pendingBillId}`,
    orderId: pendingBillId,
    amount: pendingBill.grandTotal,
    mode: paidBill.paymentMode,
    status: "completed",
    ledgerId: serverTxResult?.ledger_id || null,
    idempotencyKey: serverTxResult?.idempotency_key || null,
    createdAt: new Date().toISOString(),
  };

  const deducted = deductStockForOrderItems(state.inventory || [], state.recipes || {}, state.inventoryLogs || [], pendingBill.items || [], pendingBillId);

  return {
    ...state,
    inventory: deducted.inventory,
    inventoryLogs: deducted.inventoryLogs,
    payments: [...(state.payments || []).filter(p => p.id !== newPaymentRecord.id), newPaymentRecord],
    pendingBills: (state.pendingBills || []).filter(b => b.id !== pendingBillId),
    orderHistory: [paidBill, ...(state.orderHistory || [])]
  };
};

// --- Inventory & Recipes --------------------------------------------------

export function addInventoryItem(state, item) {
  const newItem = {
    id: item.id || makeId("inv"),
    name: item.name || "New Product",
    category: item.category || "General",
    unit: item.unit || "pcs",
    currentStock: Math.max(0, Number(item.currentStock) || 0),
    minStock: Math.max(0, Number(item.minStock) || 0),
    costPrice: Math.max(0, Number(item.costPrice) || 0),
    supplier: item.supplier || "",
    notes: item.notes || "",
  };
  return {
    ...state,
    inventory: [...(state.inventory || []), newItem]
  };
}

export function editInventoryItem(state, id, patch) {
  const sanitizedPatch = { ...patch };
  if (sanitizedPatch.currentStock !== undefined) {
    sanitizedPatch.currentStock = Math.max(0, Number(sanitizedPatch.currentStock) || 0);
  }
  if (sanitizedPatch.minStock !== undefined) {
    sanitizedPatch.minStock = Math.max(0, Number(sanitizedPatch.minStock) || 0);
  }
  if (sanitizedPatch.costPrice !== undefined) {
    sanitizedPatch.costPrice = Math.max(0, Number(sanitizedPatch.costPrice) || 0);
  }
  return {
    ...state,
    inventory: (state.inventory || []).map((i) => (i.id === id ? { ...i, ...sanitizedPatch } : i))
  };
}

export function deleteInventoryItem(state, id) {
  return {
    ...state,
    inventory: (state.inventory || []).filter((i) => i.id !== id)
  };
}

/**
 * Checks stock sufficiency for a given list of order items against current inventory.
 * @param {Array} inventory Current inventory items
 * @param {Object} recipes Recipe dictionary keyed by menuItemId
 * @param {Array} items Order items [{ menuItemId, qty, name }]
 * @returns {{ sufficient: boolean, warnings: Array<{ menuItemId: string, itemName: string, ingredientName: string, needed: number, available: number, unit: string }> }}
 */
export function checkInventorySufficiency(inventory = [], recipes = {}, items = []) {
  const warnings = [];
  const requiredByIngredient = {};

  (items || []).forEach((item) => {
    const recipe = recipes ? recipes[item.menuItemId] : null;
    if (recipe && Array.isArray(recipe)) {
      recipe.forEach((req) => {
        const invItem = (inventory || []).find((i) => i.id === req.ingredientId || i.name === req.ingredientName);
        if (invItem) {
          const singleInStockUnit = convertRecipeUnitToStockUnit(req.qty, req.unit, invItem.unit);
          const totalNeeded = singleInStockUnit * (item.qty || 1);
          requiredByIngredient[invItem.id] = (requiredByIngredient[invItem.id] || 0) + totalNeeded;

          const currentStock = typeof invItem.currentStock === "number" ? invItem.currentStock : (invItem.qty || 0);
          if (requiredByIngredient[invItem.id] > currentStock) {
            warnings.push({
              menuItemId: item.menuItemId,
              itemName: item.name || "Item",
              ingredientName: invItem.name,
              needed: Math.round(requiredByIngredient[invItem.id] * 1000) / 1000,
              available: currentStock,
              unit: invItem.unit
            });
          }
        }
      });
    }
  });

  return {
    sufficient: warnings.length === 0,
    warnings
  };
}

export function saveRecipe(state, menuItemId, ingredients = []) {
  return {
    ...state,
    recipes: {
      ...(state.recipes || {}),
      [menuItemId]: ingredients
    }
  };
}

export function addPurchaseEntry(state, purchaseData) {
  const { ingredientId, qty, cost, supplier, invoiceNo, date, notes } = purchaseData;
  const qtyNum = Math.max(0, Number(qty) || 0);
  const costNum = Math.max(0, Number(cost) || 0);

  let ingredientName = "Item";
  let unit = "pcs";
  let prevStock = 0;
  let newStock = 0;

  const nextInventory = (state.inventory || []).map((item) => {
    if (item.id === ingredientId) {
      ingredientName = item.name;
      unit = item.unit;
      prevStock = item.currentStock || 0;
      newStock = Math.round((prevStock + qtyNum) * 1000) / 1000;
      return {
        ...item,
        currentStock: newStock,
        supplier: supplier || item.supplier
      };
    }
    return item;
  });

  const timestamp = date || new Date().toISOString();
  const refText = invoiceNo ? `Invoice #${invoiceNo}` : "Purchase Entry";

  const newLog = {
    id: makeId("log"),
    organization_id: state?.organization_id || "00000000-0000-0000-0000-000000000001",
    inventory_item_id: ingredientId,
    inventory_item_name: ingredientName,
    ingredientId,
    ingredientName,
    type: "PURCHASE",
    quantity: qtyNum,
    qty: qtyNum,
    unit,
    previous_stock: prevStock,
    new_stock: newStock,
    timestamp,
    date: timestamp,
    reference: refText,
    reason: refText,
    created_by: "Owner",
    supplier: supplier || "-",
    cost: costNum,
    notes: notes || "",
  };

  return {
    ...state,
    inventory: nextInventory,
    inventoryLogs: [newLog, ...(state.inventoryLogs || [])]
  };
}

export function adjustStock(state, adjustmentData) {
  const { ingredientId, qty, type, reason, date } = adjustmentData;
  const qtyNum = Number(qty) || 0;

  let ingredientName = "Item";
  let unit = "pcs";
  let costPrice = 0;
  let prevStock = 0;
  let newStock = 0;

  const normalizedType = (type || "ADJUSTMENT").toUpperCase();
  const deltaQty = normalizedType === "ADJUSTMENT" ? qtyNum : -qtyNum;

  const nextInventory = (state.inventory || []).map((item) => {
    if (item.id === ingredientId) {
      ingredientName = item.name;
      unit = item.unit;
      costPrice = item.costPrice || 0;
      prevStock = item.currentStock || 0;
      newStock = normalizedType === "ADJUSTMENT" ? Math.max(0, qtyNum) : Math.max(0, prevStock - qtyNum);
      return {
        ...item,
        currentStock: Math.round(newStock * 1000) / 1000
      };
    }
    return item;
  });

  const timestamp = date || new Date().toISOString();
  const refText = reason || normalizedType;

  const newLog = {
    id: makeId("log"),
    organization_id: state?.organization_id || "00000000-0000-0000-0000-000000000001",
    inventory_item_id: ingredientId,
    inventory_item_name: ingredientName,
    ingredientId,
    ingredientName,
    type: normalizedType,
    quantity: deltaQty,
    qty: deltaQty,
    unit,
    previous_stock: prevStock,
    new_stock: newStock,
    timestamp,
    date: timestamp,
    reference: refText,
    reason: refText,
    created_by: "Staff",
    supplier: "-",
    cost: Math.round(Math.abs(deltaQty) * costPrice * 100) / 100,
  };

  return {
    ...state,
    inventory: nextInventory,
    inventoryLogs: [newLog, ...(state.inventoryLogs || [])]
  };
}

// ---------- EMPLOYEE & RBAC ACTIONS ----------

export function addEmployee(state, employeeData) {
  const employees = state.employees || [];
  
  // Enforce PIN uniqueness across active employees
  if (employeeData.pin) {
    const cleanPin = String(employeeData.pin).trim();
    const existing = employees.find(
      e => String(e.pin).trim() === cleanPin && e.status !== "disabled" && e.status !== "Inactive"
    );
    if (existing) {
      throw new Error("PIN is already assigned to another active employee.");
    }
  }

  const id = makeId("emp");
  const count = employees.length + 101;
  const newEmp = {
    id,
    employeeId: `EMP-${count}`,
    name: employeeData.name,
    phone: employeeData.phone || "",
    email: employeeData.email || "",
    role: employeeData.role || "Staff",
    department: employeeData.department || "Operations",
    pin: String(employeeData.pin || "0000").trim(),
    status: "active",
    joinedAt: new Date().toISOString().slice(0, 10),
  };

  // Sync with state.users so login works out of the box
  const nextUsers = [
    ...(state.users || []).filter(u => u.id !== id && u.pin !== newEmp.pin),
    { id, name: newEmp.name, pin: newEmp.pin, role: newEmp.role, status: "active", active: true }
  ];

  return {
    ...state,
    employees: [newEmp, ...employees],
    users: nextUsers
  };
}

export function editEmployee(state, employeeData) {
  const employees = state.employees || [];
  const oldEmp = employees.find(e => 
    (employeeData.id && String(e.id) === String(employeeData.id)) ||
    (employeeData.email && e.email && e.email.toLowerCase().trim() === employeeData.email.toLowerCase().trim()) ||
    (employeeData.role === "Owner" && e.role === "Owner")
  );
  
  if (employeeData.pin) {
    const cleanPin = String(employeeData.pin).trim();
    const existing = employees.find(e => {
      // Exclude self: by id, or email, or employeeId, or oldEmp match
      const isSelf = 
        (employeeData.id && String(e.id) === String(employeeData.id)) ||
        (employeeData.member_id && String(e.id) === String(employeeData.member_id)) ||
        (employeeData.employeeId && e.employeeId && e.employeeId === employeeData.employeeId) ||
        (employeeData.email && e.email && e.email.toLowerCase().trim() === employeeData.email.toLowerCase().trim()) ||
        (oldEmp && (String(e.id) === String(oldEmp.id) || (e.email && oldEmp.email && e.email.toLowerCase().trim() === oldEmp.email.toLowerCase().trim())));

      if (isSelf) return false;

      return String(e.pin).trim() === cleanPin &&
             e.status !== "disabled" &&
             e.status !== "Inactive";
    });

    if (existing) {
      throw new Error(`PIN "${cleanPin}" is already assigned to ${existing.name || "another employee"}.`);
    }
  }

  const updatedEmployees = employees.map(e => {
    const isTarget = 
      (employeeData.id && String(e.id) === String(employeeData.id)) ||
      (oldEmp && String(e.id) === String(oldEmp.id)) ||
      (employeeData.email && e.email && e.email.toLowerCase().trim() === employeeData.email.toLowerCase().trim());

    if (isTarget) {
      return { 
        ...e, 
        ...employeeData, 
        id: e.id || employeeData.id,
        employeeId: e.employeeId || employeeData.employeeId || (e.id ? `EMP-${String(e.id).replace(/\D/g, '') || '101'}` : "EMP-101"),
        pin: String(employeeData.pin || e.pin).trim() 
      };
    }
    return e;
  });

  // Sync state.users comprehensively (match by id, name, or role if Owner)
  let updatedUsers = false;
  const nextUsers = (state.users || []).map(u => {
    const isMatch = 
      (employeeData.id && String(u.id) === String(employeeData.id)) ||
      (oldEmp && (u.name === oldEmp.name || String(u.id) === String(oldEmp.id))) ||
      (employeeData.name && u.name === employeeData.name) ||
      (employeeData.role === "Owner" && u.role === "Owner");

    if (isMatch) {
      updatedUsers = true;
      return {
        ...u,
        id: employeeData.id || u.id,
        name: employeeData.name || u.name,
        pin: String(employeeData.pin || u.pin).trim(),
        role: employeeData.role || u.role,
        status: employeeData.status || u.status || "active",
        active: (employeeData.status || u.status) !== "disabled"
      };
    }
    return u;
  });

  if (!updatedUsers && (employeeData.id || oldEmp)) {
    nextUsers.push({
      id: employeeData.id || oldEmp?.id || "u_emp",
      name: employeeData.name || (oldEmp ? oldEmp.name : "Employee"),
      pin: String(employeeData.pin || (oldEmp ? oldEmp.pin : "0000")).trim(),
      role: employeeData.role || (oldEmp ? oldEmp.role : "Staff"),
      status: "active",
      active: true
    });
  }

  return {
    ...state,
    employees: updatedEmployees,
    users: nextUsers
  };
}

export function toggleEmployeeStatus(state, employeeId) {
  let targetEmp = null;
  const employees = (state.employees || []).map(e => {
    if (e.id === employeeId) {
      const nextStatus = e.status === "active" ? "disabled" : "active";
      targetEmp = { ...e, status: nextStatus };
      return targetEmp;
    }
    return e;
  });

  const nextUsers = (state.users || []).map(u => {
    if (targetEmp && (u.id === targetEmp.id || u.pin === targetEmp.pin || u.name === targetEmp.name)) {
      return { ...u, status: targetEmp.status, active: targetEmp.status === "active" };
    }
    return u;
  });

  return {
    ...state,
    employees,
    users: nextUsers
  };
}

export function updateRolePermissions(state, role, permissions) {
  return {
    ...state,
    rolePermissions: {
      ...(state.rolePermissions || {}),
      [role]: permissions
    }
  };
}

export function clockInShift(state, employeeId) {
  const shifts = state.shifts || [];
  const emp = (state.employees || []).find(e => e.id === employeeId);
  const newShift = {
    id: makeId("sh"),
    employeeId,
    employeeName: emp ? emp.name : "Employee",
    role: emp ? emp.role : "Staff",
    startTime: new Date().toISOString(),
    endTime: null,
    status: "On Shift",
    breakMins: 0,
  };

  return {
    ...state,
    shifts: [newShift, ...shifts]
  };
}

export function clockOutShift(state, shiftId) {
  const shifts = (state.shifts || []).map(s => {
    if (s.id === shiftId) {
      return {
        ...s,
        endTime: new Date().toISOString(),
        status: "Off Duty"
      };
    }
    return s;
  });

  return {
    ...state,
    shifts
  };
}

export function recordActivityLog(state, { employeeName, action, module }) {
  const newLog = {
    id: makeId("log"),
    employeeName: employeeName || "System User",
    action,
    module: module || "System",
    timestamp: new Date().toISOString()
  };

  return {
    ...state,
    activityLogs: [newLog, ...(state.activityLogs || []).slice(0, 100)] // Keep max 100 logs
  };
}

// ---------- QR & CUSTOMER SELF-SERVICE ACTIONS ----------

export function requestTableAssistance(state, tableId, type = "waiter") {
  const table = (state.tables || []).find(t => t.id === tableId);
  const tableNumber = table ? table.number : tableId;
  const requests = state.assistanceRequests || [];

  // Prevent duplicate un-cleared requests of the same type for the same table
  if (requests.some(r => r.tableId === tableId && r.type === type && !r.cleared)) {
    return state;
  }

  const newRequest = {
    id: makeId("req"),
    tableId,
    tableNumber,
    type, // "waiter" or "bill"
    message: type === "bill" ? `Table ${tableNumber} requested billing.` : `Table ${tableNumber} requests assistance.`,
    timestamp: new Date().toISOString(),
    cleared: false,
  };

  return {
    ...state,
    assistanceRequests: [newRequest, ...requests]
  };
}

export function clearTableAssistance(state, requestId) {
  const requests = (state.assistanceRequests || []).map(r => {
    if (r.id === requestId) return { ...r, cleared: true };
    return r;
  });

  return {
    ...state,
    assistanceRequests: requests
  };
}

export function submitCustomerFeedback(state, feedback) {
  const newFeedback = {
    id: makeId("fb"),
    tableId: feedback.tableId,
    foodRating: feedback.foodRating || 5,
    serviceRating: feedback.serviceRating || 5,
    ambienceRating: feedback.ambienceRating || 5,
    comment: feedback.comment || "",
    timestamp: new Date().toISOString(),
  };

  return {
    ...state,
    customerFeedback: [newFeedback, ...(state.customerFeedback || [])]
  };
}

export function updateSettings(state, partialSettings, employeeName = "Owner") {
  const currentSettings = state.settings || {};
  const updatedSettings = { ...currentSettings, ...partialSettings };

  const logEntry = {
    id: makeId("log"),
    employeeName,
    action: "Updated configuration settings",
    module: "Settings",
    timestamp: new Date().toISOString()
  };

  return {
    ...state,
    cafeName: updatedSettings.businessName || state.cafeName,
    settings: updatedSettings,
    activityLogs: [logEntry, ...(state.activityLogs || [])]
  };
}

export function restoreBackup(state, restoredPayload, employeeName = "Owner") {
  const restoredData = restoredPayload.data || restoredPayload;

  const logEntry = {
    id: makeId("log"),
    employeeName,
    action: `Restored full backup payload (Backup ID: ${restoredPayload.backupId || "N/A"})`,
    module: "Disaster Recovery",
    timestamp: new Date().toISOString()
  };

  return {
    ...defaultState(),
    ...restoredData,
    activityLogs: [logEntry, ...(restoredData.activityLogs || [])]
  };
}

export function refundOrder(state, orderId, refundAmount, reason = "Customer refund", staffRole = "Manager", serverTxResult = null) {
  if (staffRole && !["Owner", "Manager"].includes(staffRole)) {
    throw new Error(`UNAUTHORIZED_ROLE: Role '${staffRole}' does not have refund authorization permissions.`);
  }

  const orders = state.orders || [];
  const orderHistory = state.orderHistory || [];
  const targetOrder = orders.find(o => o.id === orderId) || orderHistory.find(o => o.id === orderId);

  if (!targetOrder) {
    throw new Error(`Order ${orderId} not found.`);
  }

  const existingRefunds = (state.refunds || []).filter(r => r.orderId === orderId);
  const totalAlreadyRefunded = existingRefunds.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const originalPaid = Number(targetOrder.grandTotal || targetOrder.total || 0);

  if (targetOrder.status === "Refunded" || targetOrder.status === "REFUNDED" || totalAlreadyRefunded >= originalPaid) {
    throw new Error("Order has already been fully refunded.");
  }

  const requestedAmount = Number(refundAmount || originalPaid);
  if (requestedAmount <= 0) {
    throw new Error("INVALID_REFUND_AMOUNT: Refund amount must be greater than zero.");
  }

  if (requestedAmount + totalAlreadyRefunded > originalPaid) {
    throw new Error(`OVER_REFUND_REJECTED: Refund amount (₹${requestedAmount}) exceeds remaining refundable amount (₹${originalPaid - totalAlreadyRefunded}).`);
  }

  const isFullRefund = (requestedAmount + totalAlreadyRefunded) >= originalPaid;
  const newStatus = isFullRefund ? "Refunded" : "Partially Refunded";

  const refundId = serverTxResult?.refund_id || makeId("ref");
  const ledgerId = serverTxResult?.ledger_id || null;
  const timestamp = new Date().toISOString();

  const newRefundRecord = {
    id: refundId,
    orderId,
    amount: requestedAmount,
    reason,
    serverConfirmed: Boolean(serverTxResult?.success),
    ledgerId,
    idempotencyKey: serverTxResult?.idempotency_key || null,
    createdAt: timestamp
  };

  const refundPaymentRecord = {
    id: `pay_ref_${refundId}`,
    orderId,
    amount: -requestedAmount,
    mode: "Refund",
    status: "refunded",
    ledgerId,
    idempotencyKey: serverTxResult?.idempotency_key || null,
    createdAt: timestamp
  };

  const updatedOrders = orders.map(o => o.id === orderId ? { ...o, status: newStatus, refundedAmount: (o.refundedAmount || 0) + requestedAmount } : o);
  const updatedHistory = orderHistory.map(o => o.id === orderId ? { ...o, status: newStatus, refundedAmount: (o.refundedAmount || 0) + requestedAmount } : o);

  return {
    ...state,
    orders: updatedOrders,
    orderHistory: updatedHistory,
    refunds: [...(state.refunds || []), newRefundRecord],
    payments: [...(state.payments || []), refundPaymentRecord]
  };
}

/**
 * Archives and prunes historical orders, inventory logs, and activity logs to keep
 * the live state payload lightweight (<200KB) and prevent memory/bandwidth bloat.
 *
 * @param {object} state Current application state
 * @param {object} [options] Archival thresholds
 * @returns {object} Updated state with bounded historical arrays
 */
export function archiveHistoricalData(state, options = {}) {
  const keepOrders = options.keepOrders || 300;
  const keepLogs = options.keepLogs || 300;
  const keepActivity = options.keepActivity || 100;

  const currentHistory = state.orderHistory || [];
  const currentInvLogs = state.inventoryLogs || [];
  const currentActivity = state.activityLogs || [];
  const prunedHistory = currentHistory.slice(-keepOrders);
  const archivedOrders = currentHistory.slice(0, Math.max(0, currentHistory.length - keepOrders));

  const prunedInvLogs = currentInvLogs.slice(0, keepLogs);
  const prunedActivity = currentActivity.slice(0, keepActivity);

  return {
    ...state,
    orderHistory: prunedHistory,
    inventoryLogs: prunedInvLogs,
    activityLogs: prunedActivity,
    archivedOrdersCount: (state.archivedOrdersCount || 0) + archivedOrders.length,
    lastArchivedAt: new Date().toISOString()
  };
}
