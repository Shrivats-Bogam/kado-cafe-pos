import { useState } from "react";
import {
  ArrowRightLeft, Merge, Split, BookmarkCheck, Sparkles, QrCode,
  Copy, X, ChevronRight, Check, AlertCircle, ShoppingBag
} from "lucide-react";
import { Modal, ModalHeader, PrimaryButton, IconButton } from "./ui.jsx";
import { orderTotal, currency } from "../lib/currency.js";

export default function TableActionsMenu({
  table,
  tables = [],
  menuItems = [],
  onClose,
  onShowQR,
  onTransferTable,
  onMergeTable,
  onSplitTable,
  onReserveTable,
  onSetCleaning,
  onDuplicateOrder,
}) {
  const [activeTab, setActiveTab] = useState("menu"); // "menu" | "transfer" | "merge" | "split" | "reserve" | "duplicate"
  const [targetTableId, setTargetTableId] = useState("");
  const [customerNameInput, setCustomerNameInput] = useState(table.customerName || "");
  const [capacityInput, setCapacityInput] = useState(table.capacity || 4);
  const [splitQuantities, setSplitQuantities] = useState({});
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const otherTables = tables.filter((t) => t.id !== table.id);
  const availableTables = otherTables.filter((t) => t.status === "available");
  const occupiedOtherTables = otherTables.filter((t) => t.items.length > 0);

  // --- Handlers ---

  const handleTransferSubmit = () => {
    if (!targetTableId) return;
    if (onTransferTable) {
      onTransferTable(table.id, targetTableId);
    }
    onClose();
  };

  const handleMergeSubmit = () => {
    if (!targetTableId) return;
    if (onMergeTable) {
      onMergeTable(table.id, targetTableId);
    }
    onClose();
  };

  const handleSplitSubmit = () => {
    if (!targetTableId) return;
    const itemsToMove = Object.entries(splitQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([menuItemId, qty]) => ({ menuItemId, qty }));

    if (itemsToMove.length === 0) {
      setFeedbackMsg("Please select at least 1 item to split.");
      return;
    }

    if (onSplitTable) {
      onSplitTable(table.id, targetTableId, itemsToMove);
    }
    onClose();
  };

  const handleReserveSubmit = () => {
    if (onReserveTable) {
      onReserveTable(table.id, customerNameInput, capacityInput);
    }
    onClose();
  };

  const handleCleaningToggle = () => {
    if (onSetCleaning) {
      onSetCleaning(table.id);
    }
    onClose();
  };

  const handleDuplicateSubmit = () => {
    if (!targetTableId) return;
    if (onDuplicateOrder) {
      onDuplicateOrder(table.id, targetTableId);
    }
    onClose();
  };

  const menuOptions = [
    {
      id: "transfer",
      label: "Transfer Table",
      desc: "Move entire order to another table",
      icon: ArrowRightLeft,
      color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
      disabled: table.items.length === 0 || availableTables.length === 0,
      disabledReason: table.items.length === 0 ? "No active items" : "No available tables",
    },
    {
      id: "merge",
      label: "Merge Table",
      desc: "Combine items with another table",
      icon: Merge,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
      disabled: table.items.length === 0 || occupiedOtherTables.length === 0,
      disabledReason: table.items.length === 0 ? "No active items" : "No other occupied tables",
    },
    {
      id: "split",
      label: "Split Table",
      desc: "Move selected items to another table",
      icon: Split,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      disabled: table.items.length === 0 || otherTables.length === 0,
      disabledReason: table.items.length === 0 ? "No active items" : "No target tables",
    },
    {
      id: "reserve",
      label: "Reserve Table",
      desc: "Mark table reserved for guests",
      icon: BookmarkCheck,
      color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
      disabled: false,
    },
    {
      id: "cleaning",
      label: table.status === "cleaning" ? "Finish Cleaning" : "Cleaning Mode",
      desc: table.status === "cleaning" ? "Mark table clean & available" : "Mark table for housekeeping",
      icon: Sparkles,
      color: "text-stone-400 bg-stone-500/10 border-stone-500/20",
      disabled: false,
      onClick: handleCleaningToggle,
    },
    {
      id: "qr",
      label: "Generate QR",
      desc: "Show customer QR code menu",
      icon: QrCode,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      disabled: false,
      onClick: () => {
        if (onShowQR) onShowQR(table.id);
        onClose();
      },
    },
    {
      id: "duplicate",
      label: "Duplicate Order",
      desc: "Copy order items to another table",
      icon: Copy,
      color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
      disabled: table.items.length === 0 || availableTables.length === 0,
      disabledReason: table.items.length === 0 ? "No active items" : "No available tables",
    },
  ];

  return (
    <Modal onClose={onClose} className="sm:max-w-lg">
      <ModalHeader
        title={`Table ${table.number} Actions`}
        onClose={onClose}
      />

      {/* Main Menu View */}
      {activeTab === "menu" && (
        <div className="flex flex-col gap-2 mt-4 max-h-[70vh] overflow-y-auto no-scrollbar">
          {menuOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                disabled={opt.disabled}
                onClick={() => {
                  if (opt.onClick) {
                    opt.onClick();
                  } else {
                    setActiveTab(opt.id);
                    setTargetTableId("");
                    setFeedbackMsg("");
                  }
                }}
                className={`min-h-[52px] p-3 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 ${
                  opt.disabled
                    ? "opacity-40 bg-stone-900/50 border-stone-800/50 cursor-not-allowed"
                    : "bg-stone-900 hover:bg-stone-800 border-stone-800 hover:border-stone-700 active:scale-[0.99]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${opt.color}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-stone-100">{opt.label}</h4>
                    <p className="text-xs text-stone-400">
                      {opt.disabled ? opt.disabledReason : opt.desc}
                    </p>
                  </div>
                </div>
                {!opt.disabled && <ChevronRight size={18} className="text-stone-500" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Transfer Table Form */}
      {activeTab === "transfer" && (
        <div className="flex flex-col gap-4 mt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-stone-200">Select Target Table</h4>
            <button onClick={() => setActiveTab("menu")} className="text-xs text-amber-400 hover:underline">
              Back to Menu
            </button>
          </div>
          <p className="text-xs text-stone-400">
            Transfer all {table.items.length} items from Table {table.number} to an available table.
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto no-scrollbar py-1">
            {availableTables.map((t) => (
              <button
                key={t.id}
                onClick={() => setTargetTableId(t.id)}
                className={`min-h-[48px] p-3 rounded-xl border font-medium text-sm flex flex-col items-center justify-center transition-all ${
                  targetTableId === t.id
                    ? "bg-amber-500 text-stone-950 border-amber-400 font-bold"
                    : "bg-stone-800 text-stone-200 border-stone-700 hover:bg-stone-700"
                }`}
              >
                <span>T-{t.number}</span>
                <span className="text-[10px] opacity-75">Available</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setActiveTab("menu")}
              className="min-h-[48px] flex-1 rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 text-sm font-medium"
            >
              Cancel
            </button>
            <PrimaryButton
              disabled={!targetTableId}
              onClick={handleTransferSubmit}
              className="min-h-[48px] flex-1"
            >
              Transfer Now
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Merge Table Form */}
      {activeTab === "merge" && (
        <div className="flex flex-col gap-4 mt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-stone-200">Merge Into Table</h4>
            <button onClick={() => setActiveTab("menu")} className="text-xs text-amber-400 hover:underline">
              Back to Menu
            </button>
          </div>
          <p className="text-xs text-stone-400">
            Merge items from Table {table.number} into another occupied table order.
          </p>

          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto no-scrollbar py-1">
            {occupiedOtherTables.map((t) => {
              const { grandTotal } = orderTotal(t.items, menuItems);
              return (
                <button
                  key={t.id}
                  onClick={() => setTargetTableId(t.id)}
                  className={`min-h-[52px] p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    targetTableId === t.id
                      ? "bg-amber-500 text-stone-950 border-amber-400 font-bold"
                      : "bg-stone-800 text-stone-200 border-stone-700 hover:bg-stone-700"
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span>Table {t.number}</span>
                    <span className="text-xs">{t.items.length} items</span>
                  </div>
                  <span className="text-xs opacity-80 mt-1">{currency(grandTotal)}</span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setActiveTab("menu")}
              className="min-h-[48px] flex-1 rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 text-sm font-medium"
            >
              Cancel
            </button>
            <PrimaryButton
              disabled={!targetTableId}
              onClick={handleMergeSubmit}
              className="min-h-[48px] flex-1"
            >
              Merge Tables
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Split Table Form */}
      {activeTab === "split" && (
        <div className="flex flex-col gap-4 mt-4 max-h-[75vh] overflow-y-auto no-scrollbar">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-stone-200">Split Items</h4>
            <button onClick={() => setActiveTab("menu")} className="text-xs text-amber-400 hover:underline">
              Back to Menu
            </button>
          </div>

          <p className="text-xs text-stone-400">
            Select items and quantities to move from Table {table.number} to a target table.
          </p>

          {feedbackMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-1.5">
              <AlertCircle size={14} />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {/* Item Selector */}
          <div className="flex flex-col gap-2 border border-stone-800 rounded-xl p-2 bg-stone-950">
            {table.items.map((it) => {
              const mi = menuItems.find((m) => m.id === it.menuItemId);
              const currentMoveQty = splitQuantities[it.menuItemId] || 0;

              return (
                <div key={it.menuItemId} className="flex items-center justify-between p-2 rounded-lg bg-stone-900 border border-stone-800">
                  <div>
                    <p className="text-xs font-semibold text-stone-100">{mi?.name || "Item"}</p>
                    <p className="text-[11px] text-stone-400">{currency(mi?.price || 0)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSplitQuantities((prev) => ({
                        ...prev,
                        [it.menuItemId]: Math.max(0, (prev[it.menuItemId] || 0) - 1),
                      }))}
                      className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center justify-center font-bold"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold text-amber-400 w-6 text-center">
                      {currentMoveQty} / {it.qty}
                    </span>
                    <button
                      onClick={() => setSplitQuantities((prev) => ({
                        ...prev,
                        [it.menuItemId]: Math.min(it.qty, (prev[it.menuItemId] || 0) + 1),
                      }))}
                      className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-300 mb-1 block">Destination Table</label>
            <select
              value={targetTableId}
              onChange={(e) => setTargetTableId(e.target.value)}
              className="w-full min-h-[48px] rounded-xl bg-stone-800 border border-stone-700 px-3 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Select Target Table...</option>
              {otherTables.map((t) => (
                <option key={t.id} value={t.id}>
                  Table {t.number} ({t.status === "available" ? "Available" : `${t.items.length} items`})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setActiveTab("menu")}
              className="min-h-[48px] flex-1 rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 text-sm font-medium"
            >
              Cancel
            </button>
            <PrimaryButton
              disabled={!targetTableId}
              onClick={handleSplitSubmit}
              className="min-h-[48px] flex-1"
            >
              Split Selected Items
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Reserve Form */}
      {activeTab === "reserve" && (
        <div className="flex flex-col gap-4 mt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-stone-200">Reserve Table {table.number}</h4>
            <button onClick={() => setActiveTab("menu")} className="text-xs text-amber-400 hover:underline">
              Back to Menu
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-300 mb-1 block">Guest / Customer Name</label>
              <input
                type="text"
                value={customerNameInput}
                onChange={(e) => setCustomerNameInput(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full min-h-[48px] rounded-xl bg-stone-800 border border-stone-700 px-3 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-300 mb-1 block">Guest Count</label>
              <input
                type="number"
                min="1"
                max="20"
                value={capacityInput}
                onChange={(e) => setCapacityInput(e.target.value)}
                className="w-full min-h-[48px] rounded-xl bg-stone-800 border border-stone-700 px-3 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setActiveTab("menu")}
              className="min-h-[48px] flex-1 rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 text-sm font-medium"
            >
              Cancel
            </button>
            <PrimaryButton
              onClick={handleReserveSubmit}
              className="min-h-[48px] flex-1"
            >
              Set Reserved
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Duplicate Form */}
      {activeTab === "duplicate" && (
        <div className="flex flex-col gap-4 mt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-stone-200">Duplicate Order</h4>
            <button onClick={() => setActiveTab("menu")} className="text-xs text-amber-400 hover:underline">
              Back to Menu
            </button>
          </div>
          <p className="text-xs text-stone-400">
            Copy all {table.items.length} items from Table {table.number} to an available table.
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto no-scrollbar py-1">
            {availableTables.map((t) => (
              <button
                key={t.id}
                onClick={() => setTargetTableId(t.id)}
                className={`min-h-[48px] p-3 rounded-xl border font-medium text-sm flex flex-col items-center justify-center transition-all ${
                  targetTableId === t.id
                    ? "bg-amber-500 text-stone-950 border-amber-400 font-bold"
                    : "bg-stone-800 text-stone-200 border-stone-700 hover:bg-stone-700"
                }`}
              >
                <span>T-{t.number}</span>
                <span className="text-[10px] opacity-75">Available</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setActiveTab("menu")}
              className="min-h-[48px] flex-1 rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 text-sm font-medium"
            >
              Cancel
            </button>
            <PrimaryButton
              disabled={!targetTableId}
              onClick={handleDuplicateSubmit}
              className="min-h-[48px] flex-1"
            >
              Duplicate Order
            </PrimaryButton>
          </div>
        </div>
      )}
    </Modal>
  );
}
