import { useState, useMemo, useDeferredValue, useCallback, memo } from "react";
import {
  ArrowLeft, Zap, StickyNote, MessageSquare, Edit3, Trash2,
  Plus, Minus, Search, MoreVertical, UserPlus, User, ShieldAlert,
  ArrowRightLeft, Merge, Split, Sparkles, Check, ChevronDown, X
} from "lucide-react";
import { IconButton, PrimaryButton, Modal, ModalHeader, ConfirmDialog } from "../components/ui.jsx";
import BillModal from "../components/BillModal.jsx";
import { currency, orderTotal } from "../lib/currency.js";
import { CATEGORIES as DEFAULT_CATEGORIES } from "../data/menu.js";

const MenuItemCard = memo(function MenuItemCard({ item, qty, onAdd, onDecrement }) {
  return (
    <div className="bg-stone-900 border border-stone-800/90 hover:border-stone-700 rounded-2xl p-3 flex flex-col justify-between gap-2.5 transition shadow-xs group">
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`w-2 h-2 rounded-full shrink-0 ${item.isVeg !== false ? "bg-emerald-500" : "bg-rose-500"}`} />
          <p className="text-xs font-bold text-stone-100 leading-tight line-clamp-2" title={item.name}>
            {item.name}
          </p>
        </div>
        <p className="text-xs font-mono font-bold text-amber-400">{currency(item.price)}</p>
      </div>
      {qty === 0 ? (
        <button
          type="button"
          data-testid={`menu-item-add-${item.name}`}
          onClick={() => onAdd(item.id)}
          className="w-full h-8 rounded-xl bg-stone-800 hover:bg-amber-500 hover:text-stone-950 active:bg-amber-600 text-stone-200 text-xs font-bold flex items-center justify-center gap-1 border border-stone-700 transition cursor-pointer"
        >
          <Plus size={13} /> Add
        </button>
      ) : (
        <div className="flex items-center justify-between rounded-xl bg-stone-950 border border-amber-500/40 p-0.5 h-8">
          <button
            type="button"
            onClick={() => onDecrement(item.id)}
            className="w-7 h-full flex items-center justify-center text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg cursor-pointer"
          >
            <Minus size={13} />
          </button>
          <span className="text-xs font-mono font-bold text-amber-400">{qty}</span>
          <button
            type="button"
            onClick={() => onAdd(item.id)}
            className="w-7 h-full flex items-center justify-center text-amber-400 hover:text-amber-300 hover:bg-stone-800 rounded-lg cursor-pointer"
          >
            <Plus size={13} />
          </button>
        </div>
      )}
    </div>
  );
});

export default function TableOrderScreen({
  table,
  tables = [],
  menuItems = [],
  customers = [],
  currentUser = null,
  onClose,
  onSave,
  onGenerateBill,
  onSetStatus,
  onDeleteTable,
  onTransferTable,
  onMergeTable,
  onSplitTable
}) {
  const [cart, setCart] = useState(table.items ? table.items.map((i) => ({ ...i })) : []);
  const [customerName, setCustomerName] = useState(table.customerName || "");
  const [customerPhone, setCustomerPhone] = useState(table.customerPhone || "");
  const [orderNotes, setOrderNotes] = useState(table.orderNotes || table.notes || "");
  const [orderStatus, setOrderStatus] = useState(table.status || "occupied");
  const [priority, setPriority] = useState(table.priority || "Normal");
  
  // Billing controls
  const [discountPct, setDiscountPct] = useState(0);
  const [discountType, setDiscountType] = useState("pct"); // "pct" | "flat"
  const [discountFlat, setDiscountFlat] = useState(0);
  const [gstOn, setGstOn] = useState(false);
  const [showBill, setShowBill] = useState(false);

  // Menu Search & Category Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const deferredSearch = useDeferredValue(searchQuery);

  // UI Modals & Popovers
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteBlockedReason, setDeleteBlockedReason] = useState("");
  const [editingItemNoteIndex, setEditingItemNoteIndex] = useState(null);
  const [tempItemNote, setTempItemNote] = useState("");
  const [showKitchenNoteInput, setShowKitchenNoteInput] = useState(Boolean(orderNotes));
  const [showMobileCartDrawer, setShowMobileCartDrawer] = useState(false);

  // Calculation
  const computedDiscountPct = discountType === "pct" ? discountPct : 0;
  const totals = useMemo(() => {
    const t = orderTotal(cart, menuItems, computedDiscountPct, gstOn);
    if (discountType === "flat" && discountFlat > 0) {
      const rawSub = t.subtotal;
      const effectiveDiscount = Math.min(rawSub, discountFlat);
      const taxable = Math.max(0, rawSub - effectiveDiscount);
      const calculatedGst = gstOn ? Math.round(taxable * 0.05 * 100) / 100 : 0;
      return {
        ...t,
        discount: effectiveDiscount,
        gst: calculatedGst,
        grandTotal: Math.round((taxable + calculatedGst) * 100) / 100,
      };
    }
    return t;
  }, [cart, menuItems, computedDiscountPct, gstOn, discountType, discountFlat]);

  const totalItemsCount = cart.reduce((acc, i) => acc + (i.qty || 1), 0);
  const isRush = priority === "Rush";

  // Category List Extraction
  const categories = useMemo(() => {
    const set = new Set();
    menuItems.forEach((m) => {
      if (m.category && m.available !== false) set.add(m.category);
    });
    return ["All", ...Array.from(set)];
  }, [menuItems]);

  // Primary categories to show as pills (first 8), rest in "More" dropdown
  const visibleCategories = categories.slice(0, 8);
  const overflowCategories = categories.slice(8);

  // Filtered Menu Items
  const filteredMenuItems = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return menuItems.filter((m) => {
      if (m.available === false) return false;
      if (activeCategory !== "All" && m.category !== activeCategory) return false;
      if (q) {
        const nameMatch = (m.name || "").toLowerCase().includes(q);
        const catMatch = (m.category || "").toLowerCase().includes(q);
        if (!nameMatch && !catMatch) return false;
      }
      return true;
    });
  }, [menuItems, deferredSearch, activeCategory]);

  // Fast Cart Lookup Map
  const cartMap = useMemo(() => {
    const map = new Map();
    cart.forEach((c) => map.set(c.menuItemId, c.qty));
    return map;
  }, [cart]);

  // Fast Menu Lookup Map (O(1) instead of menuItems.find per lookup)
  const menuIndex = useMemo(
    () => new Map((menuItems || []).map((m) => [m.id, m])),
    [menuItems]
  );

  // --- Cart Mutations ---
  const handleAddItem = useCallback((menuItemId) => {
    const mi = menuIndex.get(menuItemId);
    if (!mi || mi.available === false) return;

    setCart((prev) => {
      const exists = prev.find((i) => i.menuItemId === menuItemId);
      if (exists) {
        return prev.map((i) => (i.menuItemId === menuItemId ? { ...i, qty: (i.qty || 1) + 1 } : i));
      }
      return [...prev, { menuItemId, qty: 1, name: mi.name, price: mi.price }];
    });
  }, [menuIndex]);

  const handleDecrementItem = useCallback((menuItemId) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.menuItemId === menuItemId);
      if (!exists) return prev;
      if (exists.qty <= 1) {
        return prev.filter((i) => i.menuItemId !== menuItemId);
      }
      return prev.map((i) => (i.menuItemId === menuItemId ? { ...i, qty: i.qty - 1 } : i));
    });
  }, []);

  const handleRemoveItem = (menuItemId) => {
    setCart((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
  };

  const handleSaveItemNote = (idx) => {
    setCart((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, notes: tempItemNote.trim() } : item))
    );
    setEditingItemNoteIndex(null);
    setTempItemNote("");
  };

  // --- Order Saving ---
  const handleSaveOrder = () => {
    const unavailableCartItem = cart.find((item) => {
      const mi = menuIndex.get(item.menuItemId);
      return mi && mi.available === false;
    });
    if (unavailableCartItem) {
      const mi = menuIndex.get(unavailableCartItem.menuItemId);
      alert(`"${mi?.name || "Item"}" is no longer available. Please remove it from the cart.`);
      return;
    }

    if (onSetStatus && orderStatus !== table.status) {
      onSetStatus(orderStatus);
    }

    onSave(cart, customerName, {
      priority,
      orderNotes,
      customerPhone,
      status: cart.length > 0 ? (orderStatus === "available" ? "occupied" : orderStatus) : "available"
    });
    onClose();
  };

  // --- Table Deletion Guard ---
  const handleDeleteTableClick = () => {
    setShowMoreMenu(false);

    // 1. Role Guard: Owner only
    const userRole = currentUser?.role || "Staff";
    const isOwner = userRole === "Owner";
    if (!isOwner) {
      setDeleteBlockedReason(`Permission Denied: Only the Owner can delete tables from the cafe layout. (Your role: ${userRole})`);
      return;
    }

    // 2. Archived State Guard:
    if (table.status === "archived") {
      setDeleteBlockedReason(`Table ${table.number} is already archived and removed from active service.`);
      return;
    }

    // 3. Occupancy & Active Order Guard:
    const activeOrderStatuses = ["occupied", "preparing", "serving", "ordering", "waiting", "ready", "billing", "payment_pending"];
    const isOccupiedStatus = activeOrderStatuses.includes(table.status?.toLowerCase());
    const hasItems = cart.length > 0 || (Array.isArray(table.items) && table.items.length > 0);

    if (isOccupiedStatus || hasItems) {
      setDeleteBlockedReason(
        `Table ${table.number} cannot be deleted while it has an active order or is currently occupied. Please clear, bill, or cancel the active order before deleting.`
      );
      return;
    }

    // Safe to delete
    setDeleteBlockedReason("");
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (onDeleteTable) {
      onDeleteTable(table.id);
    }
    setShowDeleteConfirm(false);
    onClose();
  };

  // Status Badge Colors
  const getStatusBadge = (st) => {
    switch (st?.toLowerCase()) {
      case "available":
        return { label: "● Available", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
      case "occupied":
      case "ordering":
        return { label: "● Occupied", className: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
      case "preparing":
      case "waiting":
        return { label: "● Preparing", className: "bg-purple-500/10 text-purple-400 border-purple-500/30" };
      case "ready":
        return { label: "● Ready", className: "bg-blue-500/10 text-blue-400 border-blue-500/30" };
      case "served":
        return { label: "● Served", className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" };
      case "cleaning":
        return { label: "● Cleaning", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" };
      default:
        return { label: `● ${st || "Active"}`, className: "bg-stone-800 text-stone-300 border-stone-700" };
    }
  };

  const statusBadge = getStatusBadge(table.status);

  return (
    <div className="fixed inset-0 z-40 bg-stone-950 flex flex-col overflow-hidden text-stone-100 font-sans select-none">
      {/* 1. TOP HEADER */}
      <header className="bg-stone-900 border-b border-stone-800 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to tables"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-stone-200 text-xs font-bold transition border border-stone-700 cursor-pointer shrink-0"
          >
            <ArrowLeft size={16} /> <span className="hidden sm:inline">Back to Tables</span>
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <h2 className="text-base sm:text-lg font-serif font-bold text-stone-50 truncate">
              {table.name || `Table ${table.number}`}
            </h2>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusBadge.className} shrink-0`}>
              {statusBadge.label}
            </span>
          </div>
        </div>

        {/* Header Right Quick Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-stone-950/60 rounded-xl border border-stone-800 text-xs">
            <span className="text-stone-400">{totalItemsCount} item{totalItemsCount !== 1 ? "s" : ""}</span>
            <span className="text-stone-600">•</span>
            <span className="font-mono font-bold text-amber-400">{currency(totals.grandTotal)}</span>
          </div>

          <button
            type="button"
            onClick={() => setPriority((p) => (p === "Rush" ? "Normal" : "Rush"))}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer ${
              isRush
                ? "bg-purple-600 text-white border-purple-500 shadow-md animate-pulse"
                : "bg-stone-800 text-stone-300 border-stone-700 hover:bg-purple-950/40 hover:text-purple-300"
            }`}
          >
            <Zap size={13} className={isRush ? "fill-white" : ""} /> {isRush ? "RUSH" : "Priority"}
          </button>

          <button
            type="button"
            onClick={() => setShowCustomerModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-bold transition cursor-pointer"
          >
            <UserPlus size={13} className="text-amber-400" />
            <span className="hidden md:inline">{customerName ? customerName : "Add Customer"}</span>
          </button>

          {/* More Actions Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu((v) => !v)}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition cursor-pointer"
              aria-label="More table options"
            >
              <MoreVertical size={16} />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl z-50 p-1.5 flex flex-col gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => { setShowCustomerModal(true); setShowMoreMenu(false); }}
                  className="flex items-center gap-2.5 px-3 py-2 text-stone-200 hover:bg-stone-800 rounded-xl transition text-left cursor-pointer"
                >
                  <User size={14} className="text-amber-400" /> Customer Details
                </button>
                <div className="border-t border-stone-800 my-0.5" />
                <button
                  type="button"
                  onClick={handleDeleteTableClick}
                  className="flex items-center gap-2.5 px-3 py-2 text-rose-400 hover:bg-rose-950/30 rounded-xl transition text-left font-semibold cursor-pointer"
                >
                  <Trash2 size={14} /> Delete Table
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. MAIN 2-COLUMN ORDERING WORKSPACE */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden p-3 sm:p-4 gap-4 max-w-7xl mx-auto w-full">
        {/* LEFT / CENTER COLUMN: Customer & Notes Card + Menu */}
        <section className="flex-1 flex flex-col gap-3 overflow-y-auto pr-0.5">
          {/* A. Customer & Order Info Card */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-3.5 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              {/* Customer Name */}
              <div>
                <label className="block text-[11px] font-bold text-stone-400 mb-1">Customer Name (Optional)</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full h-9 rounded-xl bg-stone-950 border border-stone-800 px-3 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Order / Kitchen Note */}
              <div>
                <label className="block text-[11px] font-bold text-stone-400 mb-1 flex items-center gap-1">
                  <StickyNote size={12} className="text-amber-400" /> Kitchen / Order Note
                </label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Less sugar, No onions"
                  className="w-full h-9 rounded-xl bg-stone-950 border border-stone-800 px-3 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Order Status Selector */}
              <div>
                <label className="block text-[11px] font-bold text-stone-400 mb-1">Order Status</label>
                <div className="relative">
                  <select
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value)}
                    className="w-full h-9 rounded-xl bg-stone-950 border border-stone-800 px-3 text-xs text-stone-100 font-bold focus:outline-none focus:border-amber-500 appearance-none cursor-pointer"
                  >
                    <option value="available">Available / Open</option>
                    <option value="occupied">Occupied</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready</option>
                    <option value="served">Served</option>
                    <option value="cleaning">Cleaning</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* B. Search & Category Filters */}
          <div className="flex flex-col gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search menu items..."
                className="w-full h-10 rounded-xl bg-stone-900 border border-stone-800 pl-9 pr-9 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Category Filter Pills & More Dropdown */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {visibleCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    activeCategory === cat
                      ? "bg-amber-500 text-stone-950 border-amber-400 shadow-sm"
                      : "bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200 hover:bg-stone-800"
                  }`}
                >
                  {cat}
                </button>
              ))}

              {overflowCategories.length > 0 && (
                <div className="relative shrink-0">
                  <select
                    value={overflowCategories.includes(activeCategory) ? activeCategory : "More"}
                    onChange={(e) => {
                      if (e.target.value !== "More") setActiveCategory(e.target.value);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border appearance-none pr-7 cursor-pointer ${
                      overflowCategories.includes(activeCategory)
                        ? "bg-amber-500 text-stone-950 border-amber-400 shadow-sm"
                        : "bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200"
                    }`}
                  >
                    <option value="More" disabled>More ▾</option>
                    {overflowCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
                </div>
              )}
            </div>
          </div>

          {/* C. Menu Item Cards Grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {filteredMenuItems.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  qty={cartMap.get(item.id) || 0}
                  onAdd={handleAddItem}
                  onDecrement={handleDecrementItem}
                />
              ))}

              {filteredMenuItems.length === 0 && (
                <div className="col-span-full py-12 text-center bg-stone-900/40 rounded-2xl border border-stone-800/60 flex flex-col items-center justify-center gap-1.5">
                  <p className="text-xs font-semibold text-stone-400">No available items match your selection.</p>
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(""); setActiveCategory("All"); }}
                    className="text-xs text-amber-400 font-bold hover:underline"
                  >
                    Reset Search & Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: PERSISTENT ORDER SUMMARY & BILLING (DESKTOP) */}
        <aside className="hidden md:flex w-80 lg:w-96 shrink-0 h-full flex-col bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-xl">
          {/* Summary Header */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-800 shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-stone-100 text-sm">Order Summary</h3>
              <span className="px-2 py-0.5 rounded-full bg-stone-800 text-amber-400 text-[11px] font-mono font-bold">
                {totalItemsCount}
              </span>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="text-[11px] font-bold text-stone-400 hover:text-rose-400 transition cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-stone-500 text-xs py-8 text-center">
                <p>Cart is currently empty.</p>
                <p className="text-[11px] text-stone-600 mt-1">Select items from the menu to build the order.</p>
              </div>
            ) : (
              cart.map((item, idx) => {
                const mi = menuIndex.get(item.menuItemId);
                const itemName = mi?.name || item.name || "Item";
                const unitPrice = mi?.price ?? item.price ?? 0;
                const lineTotal = unitPrice * (item.qty || 1);
                const isEditing = editingItemNoteIndex === idx;

                return (
                  <div
                    key={`${item.menuItemId}-${idx}`}
                    className="bg-stone-950/70 border border-stone-800/80 rounded-xl p-2.5 flex flex-col gap-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-stone-100 truncate">{itemName}</p>
                        <p className="text-[11px] text-stone-500 font-mono">{currency(unitPrice)} each</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-stone-200">{currency(lineTotal)}</span>
                    </div>

                    {/* Stepper & Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-stone-800/60">
                      <div className="flex items-center gap-1 bg-stone-900 border border-stone-700/80 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => handleDecrementItem(item.menuItemId)}
                          className="w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-100 rounded cursor-pointer"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-mono font-bold text-amber-400 px-1.5">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => handleAddItem(item.menuItemId)}
                          className="w-6 h-6 flex items-center justify-center text-amber-400 hover:text-amber-300 rounded cursor-pointer"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Note Trigger */}
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={tempItemNote}
                              onChange={(e) => setTempItemNote(e.target.value)}
                              placeholder="Note..."
                              className="h-6 w-24 rounded bg-stone-900 border border-stone-700 px-1.5 text-[10px] text-stone-100"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveItemNote(idx)}
                              className="px-1.5 py-0.5 rounded bg-amber-500 text-stone-950 font-bold text-[10px]"
                            >
                              OK
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItemNoteIndex(idx);
                              setTempItemNote(item.notes || "");
                            }}
                            className="text-[11px] text-stone-400 hover:text-amber-300 flex items-center gap-1"
                          >
                            <Edit3 size={11} /> {item.notes ? "Edit" : "Note"}
                          </button>
                        )}

                        {/* Delete Single Item */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.menuItemId)}
                          className="text-stone-500 hover:text-rose-400 p-1 transition cursor-pointer"
                          aria-label="Remove item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Item special instruction display */}
                    {item.notes && !isEditing && (
                      <p className="text-[10px] text-amber-300/90 italic bg-amber-950/20 px-2 py-0.5 rounded border border-amber-500/20">
                        "{item.notes}"
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Kitchen Note Trigger inside Summary */}
          <div className="pt-2 border-t border-stone-800 shrink-0">
            {showKitchenNoteInput ? (
              <div className="mb-2">
                <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1 font-bold">
                  <span className="flex items-center gap-1"><StickyNote size={11} className="text-amber-400" /> Kitchen Note</span>
                  <button type="button" onClick={() => setShowKitchenNoteInput(false)} className="text-stone-500 hover:text-stone-300">Hide</button>
                </div>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Serve drinks immediately"
                  className="w-full h-8 rounded-xl bg-stone-950 border border-stone-800 px-2.5 text-xs text-stone-100 placeholder-stone-500"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowKitchenNoteInput(true)}
                className="w-full text-left py-1 text-[11px] text-stone-400 hover:text-amber-400 flex items-center gap-1.5 transition font-semibold"
              >
                <StickyNote size={12} className="text-amber-400" />
                {orderNotes ? `Note: "${orderNotes}"` : "+ Add Kitchen Note"}
              </button>
            )}
          </div>

          {/* Billing Calculation Breakdown */}
          <div className="pt-2.5 border-t border-stone-800 text-xs space-y-1.5 shrink-0">
            <div className="flex justify-between text-stone-400">
              <span>Subtotal</span>
              <span className="font-mono">{currency(totals.subtotal)}</span>
            </div>

            {/* Discount Row */}
            <div className="flex items-center justify-between text-stone-400">
              <div className="flex items-center gap-1">
                <span>Discount</span>
                <div className="flex bg-stone-950 rounded-lg p-0.5 border border-stone-800">
                  <button
                    type="button"
                    onClick={() => setDiscountType("pct")}
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${discountType === "pct" ? "bg-amber-500 text-stone-950" : "text-stone-400"}`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType("flat")}
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${discountType === "flat" ? "bg-amber-500 text-stone-950" : "text-stone-400"}`}
                  >
                    ₹
                  </button>
                </div>
              </div>

              {discountType === "pct" ? (
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPct || ""}
                  onChange={(e) => setDiscountPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  placeholder="0"
                  className="w-14 h-6 text-right px-1.5 rounded-lg bg-stone-950 border border-stone-800 text-stone-100 font-mono text-xs"
                />
              ) : (
                <input
                  type="number"
                  min="0"
                  value={discountFlat || ""}
                  onChange={(e) => setDiscountFlat(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  className="w-16 h-6 text-right px-1.5 rounded-lg bg-stone-950 border border-stone-800 text-stone-100 font-mono text-xs"
                />
              )}
            </div>

            {totals.discount > 0 && (
              <div className="flex justify-between text-rose-400 text-xs">
                <span>Discount Applied</span>
                <span className="font-mono">-{currency(totals.discount)}</span>
              </div>
            )}

            {/* GST Toggle */}
            <div className="flex items-center justify-between text-stone-400">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gstOn}
                  onChange={(e) => setGstOn(e.target.checked)}
                  className="rounded bg-stone-950 border-stone-800 text-amber-500 focus:ring-0 cursor-pointer"
                />
                <span>GST (5%)</span>
              </label>
              <span className="font-mono">{currency(totals.gst)}</span>
            </div>

            {/* Grand Total */}
            <div className="flex justify-between items-baseline pt-2 border-t border-stone-800/80">
              <span className="font-bold text-stone-200">Grand Total</span>
              <span className="font-serif font-bold text-base text-amber-400 font-mono">
                {currency(totals.grandTotal)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-stone-800 shrink-0">
            <button
              type="button"
              data-testid="save-order-btn"
              onClick={handleSaveOrder}
              className="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 active:bg-stone-600 border border-stone-700 text-stone-100 text-xs font-bold transition cursor-pointer min-h-[44px]"
            >
              Save / Send
            </button>
            <PrimaryButton
              disabled={cart.length === 0}
              data-testid="generate-bill-btn"
              onClick={() => setShowBill(true)}
              className="py-2.5 px-3 text-xs font-bold min-h-[44px]"
            >
              Generate Bill
            </PrimaryButton>
          </div>
        </aside>
      </main>

      {/* MOBILE STICKY BOTTOM SUMMARY BAR */}
      <div className="md:hidden sticky bottom-0 bg-stone-900 border-t border-stone-800 p-3 flex items-center justify-between shadow-2xl z-20">
        <button
          type="button"
          onClick={() => setShowMobileCartDrawer(true)}
          className="flex flex-col text-left"
        >
          <span className="text-xs font-bold text-stone-100">
            Cart • {totalItemsCount} item{totalItemsCount !== 1 ? "s" : ""}
          </span>
          <span className="text-xs font-mono font-bold text-amber-400">
            {currency(totals.grandTotal)}
          </span>
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            data-testid="mobile-save-order-btn"
            onClick={handleSaveOrder}
            className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold border border-stone-700"
          >
            Save
          </button>
          <PrimaryButton
            disabled={cart.length === 0}
            data-testid="mobile-generate-bill-btn"
            onClick={() => setShowBill(true)}
            className="px-4 py-2 text-xs font-bold"
          >
            Bill
          </PrimaryButton>
        </div>
      </div>

      {/* MOBILE FULL SHEET CART DRAWER */}
      {showMobileCartDrawer && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex flex-col justify-end md:hidden">
          <div className="bg-stone-900 border-t border-stone-800 rounded-t-3xl p-4 max-h-[85vh] flex flex-col gap-3 overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-stone-800">
              <h3 className="font-bold text-stone-100 text-sm">Order Summary</h3>
              <button
                type="button"
                onClick={() => setShowMobileCartDrawer(false)}
                className="text-stone-400 text-xs font-bold px-2 py-1 bg-stone-800 rounded-lg"
              >
                Close ✕
              </button>
            </div>

            {/* Mobile Cart Items */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {cart.map((item, idx) => {
                const mi = menuIndex.get(item.menuItemId);
                return (
                  <div key={idx} className="flex justify-between items-center bg-stone-950 p-2 rounded-xl border border-stone-800 text-xs">
                    <div>
                      <p className="font-bold text-stone-200">{mi?.name || item.name}</p>
                      <p className="text-stone-500">{currency(mi?.price || 0)} × {item.qty}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400">{currency((mi?.price || 0) * item.qty)}</span>
                      <button onClick={() => handleRemoveItem(item.menuItemId)} className="text-rose-400 p-1">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-800">
              <button
                onClick={() => { handleSaveOrder(); setShowMobileCartDrawer(false); }}
                className="py-2.5 rounded-xl bg-stone-800 text-stone-200 text-xs font-bold"
              >
                Save / Send Kitchen
              </button>
              <PrimaryButton
                disabled={cart.length === 0}
                onClick={() => { setShowMobileCartDrawer(false); setShowBill(true); }}
                className="py-2.5 text-xs font-bold"
              >
                Generate Bill
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* 3. CUSTOMER MODAL */}
      {showCustomerModal && (
        <Modal onClose={() => setShowCustomerModal(false)}>
          <ModalHeader title="Customer & Loyalty Info" onClose={() => setShowCustomerModal(false)} />
          <div className="p-4 space-y-3 text-xs">
            <div>
              <label className="block text-stone-400 font-bold mb-1">Customer Full Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full h-10 rounded-xl bg-stone-950 border border-stone-800 px-3 text-stone-100"
              />
            </div>
            <div>
              <label className="block text-stone-400 font-bold mb-1">Phone Number (Loyalty)</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full h-10 rounded-xl bg-stone-950 border border-stone-800 px-3 text-stone-100 font-mono"
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCustomerModal(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 4. DELETE TABLE BLOCKED WARNING MODAL */}
      {deleteBlockedReason && (
        <Modal onClose={() => setDeleteBlockedReason("")}>
          <ModalHeader title="Cannot Delete Table" onClose={() => setDeleteBlockedReason("")} />
          <div className="p-4 space-y-4 text-xs">
            <div className="flex items-start gap-3 bg-rose-950/30 border border-rose-800/60 p-3.5 rounded-2xl">
              <ShieldAlert size={20} className="text-rose-400 shrink-0 mt-0.5" />
              <p className="text-rose-200 leading-relaxed">{deleteBlockedReason}</p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setDeleteBlockedReason("")}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. DELETE TABLE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title={`Delete ${table.name || `Table ${table.number}`}?`}
          message="Are you sure you want to delete this table? This will remove the table from the active cafe layout. Historical order records will remain safe and intact."
          confirmLabel="Delete Table"
          onConfirm={handleConfirmDelete}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* 6. SERVER-AUTHORITATIVE BILL MODAL */}
      {showBill && (
        <BillModal
          title={table.name || `Table ${table.number}`}
          customerName={customerName}
          cart={cart}
          menuItems={menuItems}
          totals={totals}
          customers={customers}
          onClose={() => setShowBill(false)}
          onConfirm={async (paymentMode, phone, redeemedPoints, splitBreakdown) => {
            await onGenerateBill(cart, customerName, totals, paymentMode, phone, redeemedPoints, splitBreakdown);
            setShowBill(false);
            onClose();
          }}
        />
      )}
    </div>
  );
}
