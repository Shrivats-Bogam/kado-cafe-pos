import { useState } from "react";
import {
  ArrowRightLeft, Merge, Split, BookmarkCheck, QrCode,
  ChevronRight, AlertCircle, Edit2, Trash2, Coffee
} from "lucide-react";
import { Modal, ModalHeader, PrimaryButton } from "./ui/index.js";
import { orderTotal, currency } from "../lib/currency.js";

export default function TableActionsMenu({
  table,
  tables = [],
  menuItems = [],
  onClose,
  onOpenTable,
  onShowQR,
  onTransferTable,
  onMergeTable,
  onSplitTable,
  onReserveTable,
  onEditTable,
  onDeleteTable,
}) {
  const [activeTab, setActiveTab] = useState("menu");
  const [targetTableId, setTargetTableId] = useState("");
  const [customerNameInput, setCustomerNameInput] = useState(table.customerName || "");
  const [capacityInput, setCapacityInput] = useState(table.capacity || 4);
  const [splitQuantities, setSplitQuantities] = useState({});
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const otherTables = (tables || []).filter((t) => t.id !== table.id);
  const availableTables = otherTables.filter((t) => t.status === "available");
  const occupiedOtherTables = otherTables.filter((t) => t.items && t.items.length > 0);

  const handleTransferSubmit = () => {
    if (!targetTableId) return;
    if (onTransferTable) onTransferTable(table.id, targetTableId);
    onClose();
  };

  const handleMergeSubmit = () => {
    if (!targetTableId) return;
    if (onMergeTable) onMergeTable(table.id, targetTableId);
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

    if (onSplitTable) onSplitTable(table.id, targetTableId, itemsToMove);
    onClose();
  };

  const handleReserveSubmit = () => {
    if (onReserveTable) onReserveTable(table.id, customerNameInput, capacityInput);
    onClose();
  };

  const menuOptions = [
    {
      id: "open",
      label: "Open Table Order",
      desc: "Open order taking screen for table",
      icon: Coffee,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      disabled: false,
      onClick: () => {
        if (onOpenTable) onOpenTable(table.id);
        onClose();
      },
    },
    {
      id: "edit",
      label: "Rename / Edit Table",
      desc: "Change table name, capacity, shape & area",
      icon: Edit2,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      disabled: false,
      onClick: () => {
        if (onEditTable) onEditTable(table);
        onClose();
      },
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
      id: "transfer",
      label: "Transfer Table",
      desc: "Move entire order to another table",
      icon: ArrowRightLeft,
      color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
      disabled: !table.items || table.items.length === 0 || availableTables.length === 0,
      disabledReason: !table.items || table.items.length === 0 ? "No active items" : "No available tables",
    },
    {
      id: "merge",
      label: "Merge Table",
      desc: "Combine items with another table",
      icon: Merge,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
      disabled: !table.items || table.items.length === 0 || occupiedOtherTables.length === 0,
      disabledReason: !table.items || table.items.length === 0 ? "No active items" : "No other occupied tables",
    },
    {
      id: "split",
      label: "Split Table",
      desc: "Move selected items to another table",
      icon: Split,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      disabled: !table.items || table.items.length === 0 || otherTables.length === 0,
      disabledReason: !table.items || table.items.length === 0 ? "No active items" : "No target tables",
    },
    {
      id: "qr",
      label: "Generate QR Code",
      desc: "View, print, or download customer QR code",
      icon: QrCode,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      disabled: false,
      onClick: () => {
        if (onShowQR) onShowQR(table.id);
        onClose();
      },
    },
    {
      id: "delete",
      label: "Delete Table",
      desc: "Remove dining table (Requires confirmation)",
      icon: Trash2,
      color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
      disabled: table.items && table.items.length > 0,
      disabledReason: "Cannot delete occupied table",
      onClick: () => {
        if (onDeleteTable) onDeleteTable(table.id);
        onClose();
      },
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
                    : "bg-stone-900 hover:bg-stone-800 border-stone-800 hover:border-stone-700 active:scale-[0.99] cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${opt.color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm text-stone-100 truncate">{opt.label}</h4>
                    <p className="text-xs text-stone-400 truncate">
                      {opt.disabled ? opt.disabledReason : opt.desc}
                    </p>
                  </div>
                </div>
                {!opt.disabled && <ChevronRight size={18} className="text-stone-500 shrink-0" />}
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
            Transfer all {table.items?.length || 0} items from Table {table.number} to an available table.
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
              const { grandTotal } = orderTotal(t.items || [], menuItems);
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
                    <span className="text-xs">{t.items?.length || 0} items</span>
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
    </Modal>
  );
}
