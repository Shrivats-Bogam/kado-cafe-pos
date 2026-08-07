import { useState, useEffect } from "react";
import { X, Coffee, Sparkles, Hash, StickyNote, QrCode, Layers } from "lucide-react";
import { Card, PrimaryButton, IconButton } from "../ui/index.js";
import { TableCapacityPicker } from "./TableCapacityPicker.jsx";

export const TABLE_TYPES = [
  { id: "Indoor", label: "Indoor Main Dining" },
  { id: "Outdoor", label: "Outdoor Patio / Garden" },
  { id: "VIP", label: "VIP Private Booth" },
  { id: "Counter", label: "Espresso Bar / Counter" },
  { id: "Family", label: "Family Large Dining" },
];

export const TABLE_SHAPES = [
  { id: "square", label: "Square", icon: "□", desc: "Standard 2-4" },
  { id: "round", label: "Round", icon: "○", desc: "Circular booth" },
  { id: "rectangle", label: "Rectangle", icon: "▭", desc: "Long dining" },
  { id: "sofa", label: "Sofa / Lounge", icon: "🛋", desc: "Lounge seating" },
];

export function TableModal({ table, nextTableNumber = 1, onClose, onSave }) {
  const isEdit = Boolean(table);

  const [number, setNumber] = useState(table?.number || nextTableNumber);
  const [name, setName] = useState(table?.name || "");
  const [capacity, setCapacity] = useState(table?.capacity || 4);
  const [type, setType] = useState(table?.type || "Indoor");
  const [shape, setShape] = useState(table?.shape || "square");
  const [qrEnabled, setQrEnabled] = useState(table?.qrEnabled !== false);
  const [notes, setNotes] = useState(table?.notes || "");

  useEffect(() => {
    if (table) {
      setNumber(table.number);
      setName(table.name || "");
      setCapacity(table.capacity || 4);
      setType(table.type || "Indoor");
      setShape(table.shape || "square");
      setQrEnabled(table.qrEnabled !== false);
      setNotes(table.notes || "");
    }
  }, [table]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!number || number < 1) return;

    const payload = {
      ...(table || {}),
      id: table ? table.id : `t_${Date.now()}`,
      number: Number(number),
      name: name.trim() || `Table ${number}`,
      capacity: Number(capacity),
      type,
      shape,
      area: type,
      qrEnabled,
      notes: notes.trim(),
      status: table ? table.status : "available",
      items: table ? (table.items || []) : [],
      customerName: table ? (table.customerName || "") : "",
      startedAt: table ? table.startedAt : null,
      kitchenStatus: table ? (table.kitchenStatus || "New") : "New",
      priority: table ? (table.priority || "Normal") : "Normal",
      x: table?.x ?? (Number(number) % 4) * 180 + 20,
      y: table?.y ?? Math.floor(Number(number) / 4) * 160 + 20,
    };

    onSave(payload);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <Card
        className="w-full max-w-lg p-6 flex flex-col gap-5 shadow-2xl animate-in zoom-in-95 duration-150 rounded-2xl bg-stone-900 border-stone-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-stone-800 pb-3">
          <div>
            <h3 className="font-semibold text-lg text-stone-50 flex items-center gap-2">
              <Coffee size={20} className="text-amber-400" />
              {isEdit ? `Edit Table ${table.number}` : "Add Table Wizard"}
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              {isEdit ? "Update table configuration" : "Configure seating capacity, shape & restaurant area"}
            </p>
          </div>
          <IconButton onClick={onClose} aria-label="Close wizard">
            <X size={18} />
          </IconButton>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar pr-1">
          {/* Table Number & Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1">
                <Hash size={12} className="text-amber-400" /> Table Number <span className="text-amber-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="e.g. 1"
                required
                className="w-full rounded-xl bg-stone-800 border border-stone-700 px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Table Name / Label
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Table 1 or VIP Booth A"
                className="w-full rounded-xl bg-stone-800 border border-stone-700 px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Table Type / Area */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5 flex items-center gap-1.5">
              <Layers size={14} className="text-amber-400" /> Table Type & Area
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-xl bg-stone-800 border border-stone-700 px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {TABLE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Table Capacity Picker */}
          <TableCapacityPicker value={capacity} onChange={setCapacity} />

          {/* Table Shape Picker */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-300 flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" /> Table Shape
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TABLE_SHAPES.map((s) => {
                const isSelected = shape === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setShape(s.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-xs"
                        : "bg-stone-800 border-stone-750 text-stone-300 hover:bg-stone-750"
                    }`}
                  >
                    <span className="text-lg shrink-0">{s.icon}</span>
                    <div>
                      <p className="text-xs font-bold leading-tight">{s.label}</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">{s.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* QR Code Enable Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-800/80 border border-stone-750">
            <div className="flex items-center gap-2">
              <QrCode size={16} className="text-amber-400" />
              <div>
                <p className="text-xs font-bold text-stone-200">Customer Self-Service QR</p>
                <p className="text-[11px] text-stone-400">Allow guests to scan QR code for menu ordering</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={qrEnabled}
              onChange={(e) => setQrEnabled(e.target.checked)}
              className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1">
              <StickyNote size={12} className="text-stone-400" /> Special Notes (VIP, Window Seat, Highchair, etc.)
            </label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Near AC, Highchair available"
              className="w-full rounded-xl bg-stone-800 border border-stone-700 px-3.5 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <PrimaryButton
              type="submit"
              disabled={!number || number < 1}
              className="px-5 py-2.5 text-xs"
            >
              {isEdit ? "Save Table Changes" : "Create Dining Table"}
            </PrimaryButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
