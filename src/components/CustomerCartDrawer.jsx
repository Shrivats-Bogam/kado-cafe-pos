import { ShoppingBag, ChevronUp, ChevronDown, Edit3 } from "lucide-react";
import { useState } from "react";
import { PrimaryButton } from "./ui.jsx";
import { orderTotal, currency } from "../lib/currency.js";

export function CustomerCartDrawer({ cart, menuItems, onSubmit, t }) {
  const [expanded, setExpanded] = useState(false);
  const totals = orderTotal(cart, menuItems);
  const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);

  if (cart.length === 0) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 bg-stone-950/95 backdrop-blur border-t border-stone-800 p-4 z-30 flex flex-col gap-3 max-w-md mx-auto shadow-2xl">
      {/* Expandable item summary list */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-xs font-bold text-stone-300 hover:text-amber-400"
        >
          <ShoppingBag size={16} className="text-amber-500" />
          <span>{totalItems} items in cart</span>
          {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
        <span className="font-serif font-bold text-amber-400 text-sm">{currency(totals.grandTotal)}</span>
      </div>

      {expanded && (
        <div className="max-h-48 overflow-y-auto flex flex-col gap-2 py-2 border-y border-stone-800/80 no-scrollbar">
          {cart.map((item) => {
            const mi = menuItems.find((m) => m.id === item.menuItemId);
            return (
              <div key={item.menuItemId} className="flex justify-between items-start text-xs text-stone-300">
                <div className="flex flex-col">
                  <span className="font-semibold text-stone-100">{mi?.name || item.menuItemId} × {item.qty}</span>
                  {item.notes && (
                    <span className="text-[10px] text-amber-400/90 italic flex items-center gap-1">
                      <Edit3 size={10} /> {item.notes}
                    </span>
                  )}
                </div>
                <span className="font-mono">{currency((mi?.price || 0) * item.qty)}</span>
              </div>
            );
          })}
        </div>
      )}

      <PrimaryButton onClick={onSubmit} className="w-full text-sm font-bold py-3">
        {t.sendToKitchen} · {currency(totals.grandTotal)}
      </PrimaryButton>
    </div>
  );
}
