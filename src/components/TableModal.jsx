import { useState, useEffect } from "react";
import { X, Coffee, Sparkles, Hash, StickyNote, QrCode, MapPin, ChevronRight, ArrowLeft, AlertCircle } from "lucide-react";
import { Card, PrimaryButton, IconButton } from "./ui.jsx";
import { TableCapacityPicker } from "./TableCapacityPicker.jsx";

export const TABLE_AREAS = [
  { id: "Indoor", label: "Indoor Main Dining", desc: "Main climate-controlled dining hall" },
  { id: "Outdoor", label: "Outdoor Patio / Garden", desc: "Open-air patio & garden seating" },
  { id: "VIP", label: "VIP Private Booth", desc: "Exclusive private dining booths" },
  { id: "Counter", label: "Counter / Bar Seating", desc: "High-top counter & bar stools" },
  { id: "Family", label: "Family Dining Section", desc: "Large tables for families & groups" },
];

export const TABLE_SHAPES = [
  { id: "square", label: "Square", icon: "□", desc: "Standard 2-4 capacity" },
  { id: "round", label: "Round", icon: "○", desc: "Circular booth seating" },
  { id: "rectangle", label: "Rectangle", icon: "▭", desc: "Long family dining" },
];

export default function TableModal({ table, existingTables = [], nextTableNumber = 1, onClose, onSave }) {
  const isEdit = Boolean(table);

  const [step, setStep] = useState(1); // 1 = Basics & Area, 2 = Seating, Shape & Notes
  const [number, setNumber] = useState(table?.number || nextTableNumber);
  const [name, setName] = useState(table?.name || "");
  const [capacity, setCapacity] = useState(table?.capacity || 4);
  const [area, setArea] = useState(table?.area || table?.type || "Indoor");
  const [shape, setShape] = useState(table?.shape || "square");
  const [qrEnabled, setQrEnabled] = useState(table?.qrEnabled !== false);
  const [notes, setNotes] = useState(table?.notes || "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (table) {
      setNumber(table.number);
      setName(table.name || "");
      setCapacity(table.capacity || 4);
      setArea(table.area || table.type || "Indoor");
      setShape(table.shape || "square");
      setQrEnabled(table.qrEnabled !== false);
      setNotes(table.notes || "");
    }
  }, [table]);

  const handleNextStep = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Table Name is required.");
      return;
    }

    // Check duplicate table names/numbers for new tables or renamed tables
    const isDuplicateName = existingTables.some(
      (t) => t.id !== table?.id && (t.name || `Table ${t.number}`).toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicateName) {
      setError(`A table named "${trimmedName}" already exists. Please choose a unique name.`);
      return;
    }

    setStep(2);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Table Name is required.");
      setStep(1);
      return;
    }

    if (!capacity || Number(capacity) < 1) {
      setError("Capacity must be at least 1 guest.");
      return;
    }

    const payload = {
      ...(table || {}),
      id: table ? table.id : `t_${Date.now()}`,
      number: Number(number),
      name: trimmedName,
      capacity: Number(capacity),
      type: area,
      area: area,
      shape,
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
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <Card
        className="w-full max-w-lg p-6 flex flex-col gap-5 shadow-2xl animate-in zoom-in-95 duration-150 rounded-2xl bg-stone-900 border-stone-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-stone-800 pb-3">
          <div>
            <h3 className="font-serif text-xl font-bold text-stone-50 flex items-center gap-2">
              <Coffee size={20} className="text-amber-400" />
              {isEdit ? `Edit ${table.name}` : "Add Table Wizard"}
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Step {step} of 2 — {step === 1 ? "Table Identification & Area" : "Seating Capacity & Options"}
            </p>
          </div>
          <IconButton onClick={onClose} aria-label="Close wizard">
            <X size={18} />
          </IconButton>
        </div>

        {/* Wizard Step Indicator Bar */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`h-1.5 rounded-full transition-all ${step >= 1 ? "bg-amber-400" : "bg-stone-800"}`} />
          <div className={`h-1.5 rounded-full transition-all ${step >= 2 ? "bg-amber-400" : "bg-stone-800"}`} />
        </div>

        {/* Validation Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Wizard Form */}
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar pr-1">
          {step === 1 ? (
            <>
              {/* Table Name (Required) */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1">
                  Table Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  data-testid="table-name-input"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                  placeholder="e.g. Table 1 or VIP Booth A"
                  required
                  className="w-full min-h-[48px] rounded-xl bg-stone-800 border border-stone-700 px-3.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                />
              </div>

              {/* Table Number */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1">
                  <Hash size={12} className="text-amber-400" /> Table Number / Sequence ID
                </label>
                <input
                  type="number"
                  min="1"
                  data-testid="table-number-input"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="e.g. 1"
                  required
                  className="w-full min-h-[48px] rounded-xl bg-stone-800 border border-stone-700 px-3.5 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Restaurant Area Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                  <MapPin size={14} className="text-amber-400" /> Restaurant Area / Section
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TABLE_AREAS.map((a) => {
                    const isSelected = area === a.id;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setArea(a.id)}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer min-h-[52px] ${
                          isSelected
                            ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-xs"
                            : "bg-stone-800 border-stone-750 text-stone-300 hover:bg-stone-750"
                        }`}
                      >
                        <p className="text-xs font-bold leading-tight">{a.label}</p>
                        <p className="text-[10px] text-stone-400 mt-1">{a.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Capacity Selector (1, 2, 3, 4, 5, 6, 8, 10, 12) */}
              <TableCapacityPicker value={capacity} onChange={setCapacity} />

              {/* Table Shape Picker */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-400" /> Table Shape
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TABLE_SHAPES.map((s) => {
                    const isSelected = shape === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setShape(s.id)}
                        className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer min-h-[52px] ${
                          isSelected
                            ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-xs"
                            : "bg-stone-800 border-stone-750 text-stone-300 hover:bg-stone-750"
                        }`}
                      >
                        <span className="text-xl shrink-0">{s.icon}</span>
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
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-800/80 border border-stone-750 min-h-[48px]">
                <div className="flex items-center gap-2.5">
                  <QrCode size={18} className="text-amber-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-stone-200">Customer Self-Service QR</p>
                    <p className="text-[11px] text-stone-400">Guests scan table QR code for digital menu ordering</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={qrEnabled}
                  onChange={(e) => setQrEnabled(e.target.checked)}
                  className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1">
                  <StickyNote size={12} className="text-stone-400" /> Special Notes (Optional)
                </label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Window seat, Near AC, Highchair available"
                  className="w-full min-h-[44px] rounded-xl bg-stone-800 border border-stone-700 px-3.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </>
          )}

          {/* Footer Wizard Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-stone-800">
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium flex items-center gap-1.5 transition-colors min-h-[44px]"
              >
                <ArrowLeft size={14} /> Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium transition-colors min-h-[44px]"
              >
                Cancel
              </button>
            )}

            {step === 1 ? (
              <PrimaryButton
                type="button"
                data-testid="table-next-btn"
                onClick={handleNextStep}
                className="px-5 py-2.5 text-xs flex items-center gap-1.5 min-h-[44px]"
              >
                Next Step <ChevronRight size={14} />
              </PrimaryButton>
            ) : (
              <PrimaryButton
                type="submit"
                data-testid="table-save-btn"
                className="px-5 py-2.5 text-xs min-h-[44px]"
              >
                {isEdit ? "Save Table Changes" : "Create Dining Table"}
              </PrimaryButton>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
