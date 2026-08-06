import { useState } from "react";
import { ShoppingBag, Plus, Minus, Trash2, Edit3 } from "lucide-react";
import { currency, orderTotal } from "../lib/currency.js";

export default function ParcelCart({ 
  cart, 
  setCart, 
  menuItems, 
  onSave, 
  isEdit = false,
  isSubmitting = false 
}) {
  const [editingNoteId, setEditingNoteId] = useState(null);
  const { subtotal, gst, grandTotal } = orderTotal(cart, menuItems);

  const updateQty = (menuItemId, delta) => {
    setCart((prev) => {
      const item = prev.find((i) => i.menuItemId === menuItemId);
      if (!item) return prev;
      const nextQty = item.qty + delta;
      if (nextQty <= 0) return prev.filter((i) => i.menuItemId !== menuItemId);
      return prev.map((i) => (i.menuItemId === menuItemId ? { ...i, qty: nextQty } : i));
    });
  };

  const updateNotes = (menuItemId, notes) => {
    setCart((prev) =>
      prev.map((i) => (i.menuItemId === menuItemId ? { ...i, notes } : i))
    );
  };

  const removeItem = (menuItemId) => {
    setCart((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between h-full gap-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-3">
        <h3 className="text-base font-semibold text-stone-100 flex items-center gap-2">
          <ShoppingBag size={18} className="text-amber-500" /> Order Summary
        </h3>
        <span className="text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-2.5 py-0.5">
          {cart.reduce((acc, i) => acc + i.qty, 0)} items
        </span>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto max-h-[300px] sm:max-h-[360px] pr-1 flex flex-col gap-3">
        {cart.length === 0 ? (
          <div className="py-10 text-center text-stone-500 flex flex-col items-center">
            <ShoppingBag size={32} className="mb-2 opacity-20" />
            <p className="text-sm">Your cart is empty.</p>
            <p className="text-xs text-stone-600 mt-1">Tap menu items to add them.</p>
          </div>
        ) : (
          cart.map((item) => {
            const menuItem = menuItems.find((m) => m.id === item.menuItemId);
            if (!menuItem) return null;
            const itemTotal = menuItem.price * item.qty;

            return (
              <div 
                key={item.menuItemId} 
                className="bg-stone-950/60 border border-stone-800 rounded-xl p-3 flex flex-col gap-2 transition hover:border-stone-700"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h5 className="text-sm font-medium text-stone-100 leading-snug">{menuItem.name}</h5>
                    <p className="text-xs text-stone-400">{currency(menuItem.price)} × {item.qty}</p>
                  </div>
                  <span className="text-sm font-semibold text-amber-500">{currency(itemTotal)}</span>
                </div>

                {/* Notes section */}
                <div className="flex items-center gap-2">
                  {editingNoteId === item.menuItemId ? (
                    <input
                      type="text"
                      autoFocus
                      value={item.notes || ""}
                      onChange={(e) => updateNotes(item.menuItemId, e.target.value)}
                      onBlur={() => setEditingNoteId(null)}
                      onKeyDown={(e) => e.key === "Enter" && setEditingNoteId(null)}
                      placeholder="Item instructions (e.g. Less sugar)"
                      className="w-full text-xs rounded-lg bg-stone-900 border border-stone-700 px-2.5 py-1 text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  ) : (
                    <button
                      onClick={() => setEditingNoteId(item.menuItemId)}
                      className="text-[11px] text-stone-400 hover:text-stone-200 flex items-center gap-1 italic"
                    >
                      <Edit3 size={11} /> {item.notes ? item.notes : "Add note..."}
                    </button>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between pt-1 border-t border-stone-800/60">
                  <button 
                    onClick={() => removeItem(item.menuItemId)}
                    className="text-stone-500 hover:text-rose-400 p-1 rounded transition"
                  >
                    <Trash2 size={14} />
                  </button>

                  <div className="flex items-center gap-2 bg-stone-900 rounded-lg p-0.5 border border-stone-800">
                    <button 
                      onClick={() => updateQty(item.menuItemId, -1)}
                      className="w-7 h-7 flex items-center justify-center text-stone-300 hover:bg-stone-800 rounded transition"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="text-xs font-bold text-stone-100 min-w-[16px] text-center">{item.qty}</span>
                    <button 
                      onClick={() => updateQty(item.menuItemId, 1)}
                      className="w-7 h-7 flex items-center justify-center text-stone-300 hover:bg-stone-800 rounded transition"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bill Summary Breakdown */}
      <div className="border-t border-stone-800 pt-3 flex flex-col gap-1.5 text-xs text-stone-400">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="text-stone-200">{currency(subtotal)}</span>
        </div>
        {gst > 0 && (
          <div className="flex justify-between">
            <span>GST / Taxes</span>
            <span className="text-stone-200">{currency(gst)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold text-stone-50 pt-2 border-t border-stone-800">
          <span>Grand Total</span>
          <span className="text-amber-500">{currency(grandTotal)}</span>
        </div>
      </div>

      {/* Checkout Action Button */}
      <button
        disabled={cart.length === 0 || isSubmitting}
        onClick={onSave}
        className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 disabled:pointer-events-none text-stone-950 font-bold py-3.5 text-base flex items-center justify-center shadow-lg transition min-h-[48px]"
      >
        {isEdit ? "Update Parcel" : "Create Takeaway Order"}
      </button>
    </div>
  );
}
