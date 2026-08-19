import { useState, useMemo } from "react";
import { Printer, Check, RefreshCw, AlertCircle } from "lucide-react";
import { Card, IconButton, PrimaryButton } from "./ui.jsx";
import { currency } from "../lib/currency.js";
import { useMenuIndex } from "../lib/menuIndex.js";

// Bill/checkout modal for Table Order Screen & Direct Table Billing.
export default function BillModal({ title, customerName, cart = [], menuItems = [], totals, customers = [], onClose, onConfirm }) {
  const [paymentMode, setPaymentMode] = useState("Cash"); // Cash, UPI, Card, Split, Pending
  const [cashReceived, setCashReceived] = useState("");
  
  // Split Payment Inputs
  const [splitCash, setSplitCash] = useState("");
  const [splitUpi, setSplitUpi] = useState("");
  const [splitCard, setSplitCard] = useState("");

  const [phone, setPhone] = useState("");
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [printWidth, setPrintWidth] = useState("80mm");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const invoiceNo = "INV-" + Math.floor(1000 + Math.random() * 9000);
  const idx = useMenuIndex(menuItems);

  const matchedCustomer = phone.length >= 6 ? customers.find((c) => c.phone === phone) : null;
  const pointsValue = matchedCustomer ? Math.min(matchedCustomer.points || 0, Math.floor(totals.grandTotal)) : 0;
  const finalTotal = redeemPoints ? Math.max(0, totals.grandTotal - pointsValue) : totals.grandTotal;

  // Cash Validation & Change Calculation
  const cashNum = parseFloat(cashReceived) || 0;
  const cashChange = cashNum > 0 ? Math.max(0, cashNum - finalTotal) : 0;
  const isCashUnderpaid = paymentMode === "Cash" && cashNum < finalTotal;

  // Split Payment Total Calculation
  const splitCashNum = Math.max(0, parseFloat(splitCash) || 0);
  const splitUpiNum = Math.max(0, parseFloat(splitUpi) || 0);
  const splitCardNum = Math.max(0, parseFloat(splitCard) || 0);
  const splitSum = splitCashNum + splitUpiNum + splitCardNum;
  const splitDiff = Math.round((finalTotal - splitSum) * 100) / 100;
  const isSplitValid = paymentMode !== "Split" || (Math.abs(splitDiff) < 0.01 && splitSum > 0);

  const canConfirm = !isSubmitting && (!isCashUnderpaid || paymentMode === "Pending") && isSplitValid;

  const handleConfirmPay = async () => {
    if (!canConfirm || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const splitBreakdown = paymentMode === "Split" ? [
        { method: "Cash", amount: splitCashNum },
        { method: "UPI", amount: splitUpiNum },
        { method: "Card", amount: splitCardNum }
      ].filter(p => p.amount > 0) : null;

      await onConfirm(paymentMode, phone, redeemPoints ? pointsValue : 0, splitBreakdown);
    } catch (err) {
      console.error("[BillModal] Payment confirmation error:", err);
      setErrorMessage(err.message || "Failed to settle payment on server. Bill not marked as paid.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs overflow-y-auto flex items-start sm:items-center justify-center p-4">
      <Card className="w-full sm:max-w-md p-5 flex flex-col gap-4 my-4 sm:my-0 no-print bg-stone-900 border-stone-800 shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-stone-800 pb-3">
          <div>
            <h3 className="font-serif text-lg font-bold text-stone-50">Invoice Checkout</h3>
            <p className="text-xs text-stone-400">{invoiceNo} · {new Date().toLocaleString()}</p>
          </div>
          <IconButton onClick={onClose} aria-label="Close modal">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </IconButton>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Source & Customer Title */}
        <div className="text-sm font-semibold text-stone-200">
          <p>{title}{customerName ? ` · ${customerName}` : ""}</p>
        </div>

        {/* Line Items List */}
        <div className="flex flex-col gap-1.5 text-xs border-y border-stone-800/80 py-3 max-h-40 overflow-y-auto">
          {cart.map((c) => {
            const mi = idx.get(c.menuItemId);
            if (!mi) return null;
            return (
              <div key={c.menuItemId} className="flex justify-between text-stone-300">
                <span>{mi.name} ×{c.qty}</span>
                <span className="font-mono text-stone-200">{currency(mi.price * c.qty)}</span>
              </div>
            );
          })}
        </div>

        {/* Phone & Loyalty Match */}
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="Phone (optional — earns loyalty points)"
          className="rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
        />

        {matchedCustomer && matchedCustomer.points > 0 && (
          <label className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-600/30 px-3 py-2 text-xs text-amber-300 cursor-pointer">
            <span className="flex items-center gap-2">
              <input type="checkbox" checked={redeemPoints} onChange={(e) => setRedeemPoints(e.target.checked)} className="accent-amber-500 rounded" />
              Redeem {matchedCustomer.points} pts for {currency(pointsValue)} off
            </span>
          </label>
        )}

        {/* Totals Breakdown */}
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex justify-between text-stone-400"><span>Subtotal</span><span>{currency(totals.subtotal)}</span></div>
          {totals.discount > 0 && <div className="flex justify-between text-rose-400 font-medium"><span>Discount</span><span>-{currency(totals.discount)}</span></div>}
          {totals.gst > 0 && <div className="flex justify-between text-stone-400"><span>GST (5%)</span><span>{currency(totals.gst)}</span></div>}
          {redeemPoints && pointsValue > 0 && <div className="flex justify-between text-amber-400"><span>Points redeemed</span><span>-{currency(pointsValue)}</span></div>}
          <div className="flex justify-between text-lg font-bold text-amber-400 font-serif pt-1 border-t border-stone-800">
            <span>Grand Total</span>
            <span>{currency(finalTotal)}</span>
          </div>
        </div>

        {/* Payment Mode Selector */}
        <div>
          <p className="text-xs font-semibold text-stone-400 mb-2">Payment Mode</p>
          <div className="grid grid-cols-5 gap-1.5">
            {["Cash", "UPI", "Card", "Split", "Pending"].map((p) => (
              <button
                key={p}
                type="button"
                data-testid={`pay-mode-${p.toLowerCase()}`}
                onClick={() => setPaymentMode(p)}
                className={`rounded-xl py-2 text-xs font-bold border transition cursor-pointer ${
                  paymentMode === p
                    ? "bg-amber-500 text-stone-950 border-amber-400 shadow-md"
                    : "bg-stone-950 text-stone-300 border-stone-800 hover:bg-stone-800"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Split Payment Inputs */}
        {paymentMode === "Split" && (
          <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 flex flex-col gap-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-stone-400 font-semibold">Split Breakdown</span>
              <span className={`text-xs font-mono font-bold ${Math.abs(splitDiff) < 0.01 ? "text-emerald-400" : "text-rose-400"}`}>
                {Math.abs(splitDiff) < 0.01 ? "✓ Balanced" : `Diff: ${currency(splitDiff)}`}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-stone-400 block mb-0.5">Cash (₹)</label>
                <input
                  type="number"
                  value={splitCash}
                  onChange={(e) => setSplitCash(e.target.value)}
                  placeholder="0"
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2 py-1 text-xs font-mono text-stone-100"
                />
              </div>
              <div>
                <label className="text-[10px] text-stone-400 block mb-0.5">UPI (₹)</label>
                <input
                  type="number"
                  value={splitUpi}
                  onChange={(e) => setSplitUpi(e.target.value)}
                  placeholder="0"
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2 py-1 text-xs font-mono text-stone-100"
                />
              </div>
              <div>
                <label className="text-[10px] text-stone-400 block mb-0.5">Card (₹)</label>
                <input
                  type="number"
                  value={splitCard}
                  onChange={(e) => setSplitCard(e.target.value)}
                  placeholder="0"
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2 py-1 text-xs font-mono text-stone-100"
                />
              </div>
            </div>
          </div>
        )}

        {/* Cash Received & Change Calculation */}
        {paymentMode === "Cash" && (
          <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 flex flex-col gap-2">
            <label className="text-xs text-stone-400 font-medium">Cash Received</label>
            <div className="flex gap-2">
              <input
                type="number"
                data-testid="cash-received-input"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                placeholder={`e.g. ${finalTotal}`}
                className="flex-1 rounded-xl bg-stone-900 border border-stone-700 px-3 py-1.5 text-xs font-mono font-bold text-stone-100 focus:outline-none focus:border-amber-500"
              />
              {cashNum > 0 && (
                <div className={`px-2.5 py-1.5 rounded-xl border text-right ${
                  isCashUnderpaid ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                }`}>
                  <span className="text-[9px] block uppercase font-bold">{isCashUnderpaid ? "Short" : "Change"}</span>
                  <span className="text-xs font-mono font-bold">{currency(isCashUnderpaid ? finalTotal - cashNum : cashChange)}</span>
                </div>
              )}
            </div>
            {isCashUnderpaid && (
              <p className="text-[11px] text-rose-400 font-semibold flex items-center gap-1">
                <AlertCircle size={12} /> Cash received must be at least {currency(finalTotal)}
              </p>
            )}
          </div>
        )}

        {/* Thermal Print Format Setting */}
        <div className="flex items-center justify-between text-xs text-stone-400">
          <span>Print Format</span>
          <div className="flex gap-1">
            {["58mm", "80mm"].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setPrintWidth(w)}
                className={`rounded-lg px-2.5 py-1 border text-xs font-bold transition cursor-pointer ${
                  printWidth === w ? "bg-amber-500 text-stone-950 border-amber-400" : "bg-stone-950 border-stone-800 text-stone-400"
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl border border-stone-700 hover:bg-stone-800 text-stone-300 py-2.5 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer min-h-[44px]"
          >
            <Printer size={15} /> Print Receipt
          </button>
          <PrimaryButton
            disabled={!canConfirm}
            data-testid="confirm-payment-btn"
            onClick={handleConfirmPay}
            className="min-h-[44px] text-xs font-bold cursor-pointer"
          >
            {isSubmitting ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <>
                <Check size={16} /> {paymentMode === "Pending" ? "Mark Pending" : "Mark Paid"}
              </>
            )}
          </PrimaryButton>
        </div>
      </Card>

      {/* Thermal Receipt Print Layer */}
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
        <p className="mt-1">Status: {paymentMode === "Pending" ? "PENDING" : `PAID (${paymentMode})`}</p>
        <p className="text-center mt-2">Thank you, visit again!</p>
      </div>
    </div>
  );
}
