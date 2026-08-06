import { useState } from "react";
import { X, ShoppingCart, SlidersHorizontal } from "lucide-react";
import { Card, PrimaryButton } from "./ui.jsx";

export default function StockAdjustmentModal({ 
  inventory = [], 
  onAddPurchase, 
  onAdjustStock, 
  onClose 
}) {
  const [mode, setMode] = useState("purchase"); // "purchase" or "adjustment"

  // Purchase Form State
  const [purchaseForm, setPurchaseForm] = useState({
    ingredientId: inventory[0]?.id || "",
    supplier: inventory[0]?.supplier || "",
    invoiceNo: "",
    qty: "",
    cost: "",
    date: new Date().toISOString().slice(0, 10),
    notes: ""
  });

  // Adjustment Form State
  const [adjustForm, setAdjustForm] = useState({
    ingredientId: inventory[0]?.id || "",
    type: "Wastage", // Wastage, Damage, Staff, Adjustment
    qty: "",
    reason: "",
    date: new Date().toISOString().slice(0, 10)
  });

  const handlePurchaseSubmit = (e) => {
    e.preventDefault();
    if (!purchaseForm.ingredientId || !purchaseForm.qty) return;

    onAddPurchase({
      ingredientId: purchaseForm.ingredientId,
      supplier: purchaseForm.supplier,
      invoiceNo: purchaseForm.invoiceNo,
      qty: Number(purchaseForm.qty) || 0,
      cost: Number(purchaseForm.cost) || 0,
      date: purchaseForm.date,
      notes: purchaseForm.notes
    });

    onClose();
  };

  const handleAdjustSubmit = (e) => {
    e.preventDefault();
    if (!adjustForm.ingredientId || !adjustForm.qty) return;

    onAdjustStock({
      ingredientId: adjustForm.ingredientId,
      type: adjustForm.type,
      qty: Number(adjustForm.qty) || 0,
      reason: adjustForm.reason,
      date: adjustForm.date
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-5 bg-stone-900 border border-stone-800 flex flex-col gap-4">
        {/* Header & Mode Toggle */}
        <div className="flex justify-between items-center border-b border-stone-800 pb-3">
          <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800">
            <button
              onClick={() => setMode("purchase")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                mode === "purchase" ? "bg-amber-500 text-stone-950 shadow-sm" : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <ShoppingCart size={14} /> Add Purchase
            </button>
            
            <button
              onClick={() => setMode("adjustment")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                mode === "adjustment" ? "bg-amber-500 text-stone-950 shadow-sm" : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <SlidersHorizontal size={14} /> Stock Adjustment
            </button>
          </div>

          <button onClick={onClose} className="text-stone-400 hover:text-stone-200">
            <X size={18} />
          </button>
        </div>

        {/* Purchase Form */}
        {mode === "purchase" && (
          <form onSubmit={handlePurchaseSubmit} className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-stone-400 block mb-1">Select Ingredient *</label>
              <select
                value={purchaseForm.ingredientId}
                onChange={(e) => {
                  const item = inventory.find(i => i.id === e.target.value);
                  setPurchaseForm({
                    ...purchaseForm,
                    ingredientId: e.target.value,
                    supplier: item?.supplier || purchaseForm.supplier
                  });
                }}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              >
                {inventory.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit}) - Curr: {i.currentStock}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-stone-400 block mb-1">Quantity Purchased *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={purchaseForm.qty}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, qty: e.target.value })}
                  placeholder="e.g. 10"
                  className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-stone-400 block mb-1">Total Cost (₹)</label>
                <input
                  type="number"
                  step="any"
                  value={purchaseForm.cost}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, cost: e.target.value })}
                  placeholder="e.g. 600"
                  className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-stone-400 block mb-1">Supplier / Vendor</label>
                <input
                  type="text"
                  value={purchaseForm.supplier}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier: e.target.value })}
                  placeholder="Supplier Name"
                  className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-stone-400 block mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={purchaseForm.invoiceNo}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceNo: e.target.value })}
                  placeholder="INV-9921"
                  className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-stone-400 block mb-1">Purchase Date</label>
              <input
                type="date"
                value={purchaseForm.date}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })}
                className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-stone-700 py-2.5 text-xs text-stone-300 font-semibold"
              >
                Cancel
              </button>
              <PrimaryButton type="submit" className="flex-1 min-h-[44px] text-xs font-bold">
                Add Purchase Entry
              </PrimaryButton>
            </div>
          </form>
        )}

        {/* Adjustment Form */}
        {mode === "adjustment" && (
          <form onSubmit={handleAdjustSubmit} className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-stone-400 block mb-1">Select Ingredient *</label>
              <select
                value={adjustForm.ingredientId}
                onChange={(e) => setAdjustForm({ ...adjustForm, ingredientId: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              >
                {inventory.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit}) - Curr: {i.currentStock}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-stone-400 block mb-1">Adjustment Type *</label>
                <select
                  value={adjustForm.type}
                  onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="Wastage">Wastage (Spill/Spoiled)</option>
                  <option value="Damage">Damage (Broken/Expired)</option>
                  <option value="Staff">Staff Consumption</option>
                  <option value="Adjustment">Manual Adjustment (Set Absolute)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-stone-400 block mb-1">Quantity *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={adjustForm.qty}
                  onChange={(e) => setAdjustForm({ ...adjustForm, qty: e.target.value })}
                  placeholder="e.g. 2"
                  className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-stone-400 block mb-1">Reason / Notes *</label>
              <input
                type="text"
                required
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                placeholder="e.g. Spilled milk during rush, Expired bun..."
                className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs text-stone-400 block mb-1">Date</label>
              <input
                type="date"
                value={adjustForm.date}
                onChange={(e) => setAdjustForm({ ...adjustForm, date: e.target.value })}
                className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-stone-700 py-2.5 text-xs text-stone-300 font-semibold"
              >
                Cancel
              </button>
              <PrimaryButton type="submit" className="flex-1 min-h-[44px] text-xs font-bold">
                Apply Adjustment
              </PrimaryButton>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
