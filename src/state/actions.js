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

export function generateBillForTable(state, tableId, items, customerName, totals, paymentMode, phone, redeemedPoints) {
  const targetTable = (state.tables || []).find((t) => t.id === tableId);
  if (!targetTable || targetTable.status === "available") {
    // CONCURRENCY GUARD: Table has already been closed or billed by another client
    return state;
  }

  const billId = makeId("o");
  const finalTotal = Math.max(0, totals.grandTotal - (redeemedPoints || 0));
  const { customers, customerId } = applyLoyalty(state.customers, phone, finalTotal, redeemedPoints || 0, state.settings || {}, billId, state.orderHistory || []);
  const tableNo = targetTable.number;

  // Deduct inventory stock for table order items
  const deducted = deductStockForOrderItems(state.inventory || [], state.recipes || {}, state.inventoryLogs || [], items, billId);

  return {
    ...state,
    customers,
    inventory: deducted.inventory,
    inventoryLogs: deducted.inventoryLogs,
    orderHistory: [...(state.orderHistory || []), {
      id: billId,
      source: `Table ${tableNo}`,
      customerName,
      customerId,
      items,
      ...totals,
      grandTotal: finalTotal,
      pointsRedeemed: redeemedPoints || 0,
      paymentMode,
      status: "Paid",
      paidAt: new Date().toISOString(),
    }],
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
  return { ...state, tables: [...state.tables, newTable] };
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
  // Prevent duplicate customers by phone
  const existing = (state.customers || []).find(c => c.phone === customer.phone);
  if (existing) {
    return {
      ...state,
      customers: state.customers.map(c => c.id === existing.id ? { ...c, ...customer } : c)
    };
  }
  return { ...state, customers: [...state.customers, customer] };
}

export function editCustomer(state, id, patch) {
  return {
    ...state,
    customers: (state.customers || []).map((c) => (c.id === id ? { ...c, ...patch } : c))
  };
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

// Helper: Deduct stock automatically based on item recipes
export function deductStockForOrderItems(inventory = [], recipes = {}, inventoryLogs = [], items = [], orderId = "") {
  let nextInventory = [...(inventory || [])];
  let nextLogs = [...(inventoryLogs || [])];

  // IDEMPOTENCY GUARD: Skip duplicate inventory deductions for the same order reference
  if (orderId && nextLogs.some((l) => l.orderRef === orderId && l.type === "Sale")) {
    return { inventory: nextInventory, inventoryLogs: nextLogs };
  }

  items.forEach((item) => {
    const menuItemId = item.menuItemId;
    const itemQty = item.qty || 1;
    const recipe = recipes ? recipes[menuItemId] : null;

    if (recipe && Array.isArray(recipe) && recipe.length > 0) {
      recipe.forEach((req) => {
        const invIdx = nextInventory.findIndex((i) => i.id === req.ingredientId);
        if (invIdx >= 0) {
          const invItem = nextInventory[invIdx];
          const totalDeduction = req.qty * itemQty;
          const updatedStock = Math.max(0, Math.round((invItem.currentStock - totalDeduction) * 1000) / 1000);
          
          nextInventory[invIdx] = {
            ...invItem,
            currentStock: updatedStock
          };

          nextLogs.unshift({
            id: makeId("log"),
            orderRef: orderId,
            ingredientId: invItem.id,
            ingredientName: invItem.name,
            type: "Sale",
            qty: -totalDeduction,
            unit: invItem.unit,
            reason: `Order #${String(orderId).slice(-6)} (${item.name || "Item"} x${itemQty})`,
            supplier: invItem.supplier || "-",
            cost: Math.round(totalDeduction * (invItem.costPrice || 0) * 100) / 100,
            date: new Date().toISOString(),
          });
        }
      });
    } else {
      // PART 27: Log warning for item with no recipe configured without breaking payment
      nextLogs.unshift({
        id: makeId("log"),
        orderRef: orderId,
        ingredientId: "-",
        ingredientName: item.name || "Item",
        type: "Warning",
        qty: 0,
        unit: "-",
        reason: `Recipe not configured for ${item.name || "Item"} (Order #${String(orderId).slice(-6)})`,
        supplier: "-",
        cost: 0,
        date: new Date().toISOString(),
      });
    }
  });

  return { inventory: nextInventory, inventoryLogs: nextLogs };
}

export function createBill(state, billData) {
  const { customers, customerId } = applyLoyalty(
    state.customers, 
    billData.phone, 
    billData.grandTotal || 0, 
    billData.pointsRedeemed || 0
  );

  const billId = billData.id || makeId("o");
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
    status: billData.status || "Paid",
    paidAt: billData.paidAt || new Date().toISOString(),
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
    orderHistory: [newBill, ...(state.orderHistory || [])]
  };
}

export function updateBillStatus(state, billId, newStatus) {
  let nextInventory = state.inventory || [];
  let nextLogs = state.inventoryLogs || [];

  const nextHistory = (state.orderHistory || []).map((b) => {
    if (b.id === billId) {
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

export function payPendingBill(state, pendingBillId, paymentMode = "Cash", splitBreakdown = null) {
  const pendingBill = (state.pendingBills || []).find(b => b.id === pendingBillId);
  if (!pendingBill) return state;

  const paidBill = {
    ...pendingBill,
    status: "Paid",
    paymentMode: Array.isArray(splitBreakdown) ? "Split" : paymentMode,
    paymentBreakdown: Array.isArray(splitBreakdown) ? splitBreakdown : [{ method: paymentMode, amount: pendingBill.grandTotal }],
    paidAt: new Date().toISOString(),
  };

  const deducted = deductStockForOrderItems(state.inventory || [], state.recipes || {}, state.inventoryLogs || [], pendingBill.items || [], pendingBillId);

  return {
    ...state,
    inventory: deducted.inventory,
    inventoryLogs: deducted.inventoryLogs,
    pendingBills: (state.pendingBills || []).filter(b => b.id !== pendingBillId),
    orderHistory: [paidBill, ...(state.orderHistory || [])]
  };
}

// --- Inventory & Recipes --------------------------------------------------

export function addInventoryItem(state, item) {
  const newItem = {
    id: item.id || makeId("inv"),
    name: item.name || "New Product",
    category: item.category || "General",
    unit: item.unit || "pcs",
    currentStock: Number(item.currentStock) || 0,
    minStock: Number(item.minStock) || 0,
    costPrice: Number(item.costPrice) || 0,
    supplier: item.supplier || "",
    notes: item.notes || "",
  };
  return {
    ...state,
    inventory: [...(state.inventory || []), newItem]
  };
}

export function editInventoryItem(state, id, patch) {
  return {
    ...state,
    inventory: (state.inventory || []).map((i) => (i.id === id ? { ...i, ...patch } : i))
  };
}

export function deleteInventoryItem(state, id) {
  return {
    ...state,
    inventory: (state.inventory || []).filter((i) => i.id !== id)
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
  const qtyNum = Number(qty) || 0;
  const costNum = Number(cost) || 0;

  let ingredientName = "Item";
  let unit = "pcs";

  const nextInventory = (state.inventory || []).map((item) => {
    if (item.id === ingredientId) {
      ingredientName = item.name;
      unit = item.unit;
      return {
        ...item,
        currentStock: Math.round((item.currentStock + qtyNum) * 1000) / 1000,
        supplier: supplier || item.supplier
      };
    }
    return item;
  });

  const newLog = {
    id: makeId("log"),
    ingredientId,
    ingredientName,
    type: "Purchase",
    qty: qtyNum,
    unit,
    reason: invoiceNo ? `Invoice #${invoiceNo}` : "Purchase Entry",
    supplier: supplier || "-",
    cost: costNum,
    notes: notes || "",
    date: date || new Date().toISOString(),
  };

  return {
    ...state,
    inventory: nextInventory,
    inventoryLogs: [newLog, ...(state.inventoryLogs || [])]
  };
}

export function adjustStock(state, adjustmentData) {
  const { ingredientId, qty, type, reason, date } = adjustmentData; // type: Wastage, Damage, Staff, Adjustment
  const qtyNum = Number(qty) || 0; // Positive quantity provided by user

  let ingredientName = "Item";
  let unit = "pcs";
  let costPrice = 0;

  const deltaQty = type === "Adjustment" ? qtyNum : -qtyNum;

  const nextInventory = (state.inventory || []).map((item) => {
    if (item.id === ingredientId) {
      ingredientName = item.name;
      unit = item.unit;
      costPrice = item.costPrice || 0;
      const newStock = type === "Adjustment" ? qtyNum : Math.max(0, item.currentStock - qtyNum);
      return {
        ...item,
        currentStock: Math.round(newStock * 1000) / 1000
      };
    }
    return item;
  });

  const newLog = {
    id: makeId("log"),
    ingredientId,
    ingredientName,
    type: type || "Adjustment",
    qty: deltaQty,
    unit,
    reason: reason || type,
    supplier: "-",
    cost: Math.round(Math.abs(deltaQty) * costPrice * 100) / 100,
    date: date || new Date().toISOString(),
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
  
  // Enforce PIN uniqueness if provided
  if (employeeData.pin && employees.some(e => e.pin === employeeData.pin)) {
    throw new Error("PIN is already assigned to another employee.");
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
    pin: employeeData.pin || "0000",
    status: "active",
    joinedAt: new Date().toISOString().slice(0, 10),
  };

  // Sync with state.users so login works out of the box
  const nextUsers = [
    ...(state.users || []).filter(u => u.id !== id),
    { id, name: newEmp.name, pin: newEmp.pin, role: newEmp.role }
  ];

  return {
    ...state,
    employees: [newEmp, ...employees],
    users: nextUsers
  };
}

export function editEmployee(state, employeeData) {
  const employees = state.employees || [];
  
  if (employeeData.pin) {
    const existing = employees.find(e => e.pin === employeeData.pin && e.id !== employeeData.id);
    if (existing) {
      throw new Error("PIN is already assigned to another employee.");
    }
  }

  const updatedEmployees = employees.map(e => {
    if (e.id === employeeData.id) {
      return { ...e, ...employeeData };
    }
    return e;
  });

  // Sync state.users
  const nextUsers = (state.users || []).map(u => {
    if (u.id === employeeData.id || u.name === employeeData.name) {
      return {
        ...u,
        name: employeeData.name || u.name,
        pin: employeeData.pin || u.pin,
        role: employeeData.role || u.role
      };
    }
    return u;
  });

  return {
    ...state,
    employees: updatedEmployees,
    users: nextUsers
  };
}

export function toggleEmployeeStatus(state, employeeId) {
  const employees = (state.employees || []).map(e => {
    if (e.id === employeeId) {
      const nextStatus = e.status === "active" ? "disabled" : "active";
      return { ...e, status: nextStatus };
    }
    return e;
  });

  return {
    ...state,
    employees
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
