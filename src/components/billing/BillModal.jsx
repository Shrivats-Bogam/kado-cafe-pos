import { useState } from "react";
import { Printer } from "lucide-react";
import { Card, IconButton, PrimaryButton } from "../ui/index.js";
import { currency } from "../../lib/currency.js";
import { useMenuIndex } from "../../lib/menuIndex.js";

// Bill/checkout modal. Generates an invoice receipt, captures payment mode,
// supports loyalty point redemption for matched phone customers.
//
// Print: uses window.print() with a hidden receipt layer toggled by @media print.
// Direct Bluetooth thermal pairing from a web app isn't possible — see
// Settings → Integrations notes. Use the manufacturer's print-service app
// and "Print Receipt" works with any system-installed thermal printer (58/80mm).

export default function BillModal({ title, customerName, cart, menuItems, totals, customers, onClose, onConfirm }) {
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [phone, setPhone] = useState("");
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [printWidth, setPrintWidth] = useState("80mm");
  const invoiceNo = "INV-" + Math.floor(1000 + Math.random() * 9000);
  const idx = useMenuIndex(menuItems);

  const matchedCustomer = phone.length >= 6 ? customers.find((c) => c.phone === phone) : null;
  // 1 point = ₹1 off, capped at bill total.
  const pointsValue = matchedCustomer ? Math.min(matchedCustomer.points || 0, Math.floor(totals.grandTotal)) : 0;
  const finalTotal = redeemPoints ? Math.max(0, totals.grandTotal - pointsValue) : totals.grandTotal;

  return (
    <div className="fixed inset-0 z-40 bg-black/60 overflow-y-auto flex items-start sm:items-center justify-center p-4">
      <Card className="w-full sm:max-w-md p-5 flex flex-col gap-4 my-4 sm:my-0 no-print">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-serif text-lg text-stone-50">Invoice</h3>
            <p className="text-xs text-stone-500">{invoiceNo} · {new Date().toLocaleString()}</p>
          </div>
          <IconButton onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </IconButton>
        </div>

        <div className="text-sm text-stone-300">
          <p>{title}{customerName ? ` · ${customerName}` : ""}</p>
        </div>

        <div className="flex flex-col gap-1 text-sm border-y border-stone-800 py-3">
          {cart.map((c) => {
            const mi = idx.get(c.menuItemId);
            if (!mi) return null;
            return (
              <div key={c.menuItemId} className="flex justify-between text-stone-300">
                <span>{mi.name} ×{c.qty}</span>
                <span>{currency(mi.price * c.qty)}</span>
              </div>
            );
          })}
        </div>

        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="Phone (optional — earns loyalty points)"
          className="rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 placeholder-stone-500"
        />

        {matchedCustomer && matchedCustomer.points > 0 && (
          <label className="flex items-center justify-between rounded-lg bg-amber-500/10 border border-amber-600/30 px-3 py-2 text-xs text-amber-300">
            <span className="flex items-center gap-2">
              <input type="checkbox" checked={redeemPoints} onChange={(e) => setRedeemPoints(e.target.checked)} />
              Redeem {matchedCustomer.points} pts for {currency(pointsValue)} off
            </span>
          </label>
        )}

        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between text-stone-400"><span>Subtotal</span><span>{currency(totals.subtotal)}</span></div>
          {totals.discount > 0 && <div className="flex justify-between text-rose-400"><span>Discount</span><span>-{currency(totals.discount)}</span></div>}
          {totals.gst > 0 && <div className="flex justify-between text-stone-400"><span>GST (5%)</span><span>{currency(totals.gst)}</span></div>}
          {redeemPoints && pointsValue > 0 && <div className="flex justify-between text-amber-400"><span>Points redeemed</span><span>-{currency(pointsValue)}</span></div>}
          <div className="flex justify-between text-lg font-semibold text-stone-50"><span>Total</span><span>{currency(finalTotal)}</span></div>
        </div>

        <div>
          <p className="text-xs text-stone-500 mb-2">Payment mode</p>
          <div className="grid grid-cols-4 gap-2">
            {["Cash", "UPI", "Card", "Split"].map((p) => (
              <button
                key={p}
                onClick={() => setPaymentMode(p)}
                className={`rounded-lg py-2 text-xs font-medium border ${paymentMode === p ? "bg-amber-500 text-stone-950 border-amber-500" : "bg-stone-800 text-stone-300 border-stone-700"}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-stone-500">
          <span>Print width (system printer)</span>
          <div className="flex gap-1">
            {["58mm", "80mm"].map((w) => (
              <button key={w} onClick={() => setPrintWidth(w)} className={`rounded-md px-2 py-1 border ${printWidth === w ? "bg-amber-500 text-stone-950 border-amber-500" : "bg-stone-800 border-stone-700 text-stone-300"}`}>{w}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => window.print()} className="rounded-xl border border-stone-700 text-stone-300 py-2.5 text-sm flex items-center justify-center gap-2">
            <Printer size={15} /> Print Receipt
          </button>
          <PrimaryButton onClick={() => onConfirm(paymentMode, phone, redeemPoints ? pointsValue : 0)}>
            Mark Paid
          </PrimaryButton>
        </div>
      </Card>

      {/* Print-only receipt — shown only by @media print */}
      <div className="receipt-print p-2 font-mono text-xs" style={{ width: printWidth === "58mm" ? "58mm" : "80mm" }}>
        <p className="text-center font-bold">KADO CAFE</p>
        <p className="text-center">{invoiceNo} · {new Date().toLocaleString()}</p>
        <p>{title}{customerName ? ` · ${customerName}` : ""}</p>
        <div className="border-t border-black my-1" />
        {cart.map((c) => {
          const mi = idx.get(c.menuItemId);
          if (!mi) return null;
          return <div key={c.menuItemId} className="flex justify-between"><span>{mi.name} ×{c.qty}</span><span>{currency(mi.price * c.qty)}</span></div>;
        })}
        <div className="border-t border-black my-1" />
        <div className="flex justify-between"><span>Subtotal</span><span>{currency(totals.subtotal)}</span></div>
        {totals.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{currency(totals.discount)}</span></div>}
        {totals.gst > 0 && <div className="flex justify-between"><span>GST</span><span>{currency(totals.gst)}</span></div>}
        {redeemPoints && pointsValue > 0 && <div className="flex justify-between"><span>Points redeemed</span><span>-{currency(pointsValue)}</span></div>}
        <div className="border-t border-black my-1" />
        <div className="flex justify-between font-bold"><span>TOTAL</span><span>{currency(finalTotal)}</span></div>
        <p className="mt-1">Paid via {paymentMode}</p>
        <p className="text-center mt-2">Thank you, visit again!</p>
      </div>
    </div>
  );
}
