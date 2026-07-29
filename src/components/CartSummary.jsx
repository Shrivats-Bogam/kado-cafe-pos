import { currency, orderTotal } from "../lib/currency.js";
import { useMenuIndex } from "../lib/menuIndex.js";

export default function CartSummary({ cart, menuItems, discountPct, setDiscountPct, gstOn, setGstOn }) {
  // Index once per render; O(1) lookup per cart line replaces O(items) find.
  const idx = useMenuIndex(menuItems);
  const { subtotal, discount, gst, grandTotal } = orderTotal(cart, menuItems, discountPct, gstOn);

  if (cart.length === 0) {
    return <p className="text-sm text-stone-500 text-center py-4">Cart is empty. Add items above.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="max-h-40 overflow-y-auto flex flex-col gap-1">
        {cart.map((c) => {
          const mi = idx.get(c.menuItemId);
          if (!mi) return null;
          return (
            <div key={c.menuItemId} className="flex justify-between text-sm text-stone-300">
              <span>{mi.name} ×{c.qty}</span>
              <span>{currency(mi.price * c.qty)}</span>
            </div>
          );
        })}
      </div>
      <div className="border-t border-stone-800 pt-2 flex flex-col gap-1 text-sm">
        <div className="flex justify-between text-stone-400">
          <span>Subtotal</span>
          <span>{currency(subtotal)}</span>
        </div>
        <div className="flex justify-between items-center text-stone-400">
          <span>Discount %</span>
          <input
            type="number"
            min="0"
            max="100"
            value={discountPct}
            onChange={(e) => setDiscountPct(Number(e.target.value) || 0)}
            className="w-16 rounded-lg bg-stone-800 border border-stone-700 text-right px-2 py-0.5 text-stone-100"
          />
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-rose-400">
            <span>Discount</span>
            <span>-{currency(discount)}</span>
          </div>
        )}
        <div className="flex justify-between items-center text-stone-400">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={gstOn} onChange={(e) => setGstOn(e.target.checked)} />
            GST (5%)
          </label>
          <span>{currency(gst)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold text-stone-50 pt-1">
          <span>Grand Total</span>
          <span>{currency(grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}
