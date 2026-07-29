import { useState } from "react";
import { ArrowLeft, Zap } from "lucide-react";
import { IconButton, PrimaryButton } from "../components/ui.jsx";
import MenuPicker from "../components/MenuPicker.jsx";
import CartSummary from "../components/CartSummary.jsx";
import BillModal from "../components/BillModal.jsx";
import { orderTotal } from "../lib/currency.js";

// Full-screen takeover on a table: pick items, manage cart, generate bill.
// The "Rush" flag bumps this order to the top of the kitchen queue + plays an alert.

export default function TableOrderScreen({ table, menuItems, customers, onClose, onSave, onGenerateBill }) {
  const [cart, setCart] = useState(table.items || []);
  const [customerName, setCustomerName] = useState(table.customerName || "");
  const [discountPct, setDiscountPct] = useState(0);
  const [gstOn, setGstOn] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [priority, setPriority] = useState(table.priority || "Normal");

  const totals = orderTotal(cart, menuItems, discountPct, gstOn);
  const isRush = priority === "Rush";

  return (
    <div className="fixed inset-0 z-30 bg-stone-950 flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-stone-800">
        <IconButton onClick={onClose}><ArrowLeft size={18} /></IconButton>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-serif text-stone-50 truncate">Table {table.number}</h2>
          <p className="text-xs text-stone-500">{cart.length} item{cart.length !== 1 ? "s" : ""} in order</p>
        </div>
        <button
          onClick={() => setPriority((p) => (p === "Rush" ? "Normal" : "Rush"))}
          className={`rounded-xl px-3 py-1.5 text-xs font-medium border flex items-center gap-1.5 transition ${
            isRush
              ? "bg-rose-600 text-white border-rose-500 animate-pulse"
              : "bg-stone-800 text-stone-300 border-stone-700 hover:bg-rose-900/50"
          }`}
          aria-label="Toggle rush order"
        >
          <Zap size={13} /> {isRush ? "RUSH" : "Normal"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Customer name (optional)"
          className="w-full rounded-xl bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 placeholder-stone-500"
        />
        <MenuPicker menuItems={menuItems} cart={cart} setCart={setCart} />
      </div>

      <div className="border-t border-stone-800 p-4 flex flex-col gap-3 bg-stone-950">
        <CartSummary
          cart={cart} menuItems={menuItems}
          discountPct={discountPct} setDiscountPct={setDiscountPct}
          gstOn={gstOn} setGstOn={setGstOn}
        />
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => setCart([])} className="rounded-xl border border-stone-700 text-stone-300 py-2.5 text-sm">Clear</button>
          <button
            onClick={() => { onSave(cart, customerName, { priority }); onClose(); }}
            className="rounded-xl bg-stone-800 text-stone-100 py-2.5 text-sm font-medium"
          >Save Order</button>
          <PrimaryButton disabled={cart.length === 0} onClick={() => setShowBill(true)}>
            Generate Bill
          </PrimaryButton>
        </div>
      </div>

      {showBill && (
        <BillModal
          title={`Table ${table.number}`}
          customerName={customerName}
          cart={cart}
          menuItems={menuItems}
          totals={totals}
          customers={customers}
          onClose={() => setShowBill(false)}
          onConfirm={(paymentMode, phone, redeemedPoints) => {
            onGenerateBill(cart, customerName, totals, paymentMode, phone, redeemedPoints);
            setShowBill(false);
            onClose();
          }}
        />
      )}
    </div>
  );
}
