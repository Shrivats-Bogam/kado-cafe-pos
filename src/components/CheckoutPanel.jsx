import { useState, useMemo } from "react";
import { DollarSign, CreditCard, QrCode, SlidersHorizontal, Check, ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";
import { Card, PrimaryButton } from "./ui.jsx";
import { currency } from "../lib/currency.js";
import { useMenuIndex } from "../lib/menuIndex.js";

export default function CheckoutPanel({ 
  cart, 
  menuItems, 
  customers = [], 
  sourceTitle = "Order", 
  customerName = "", 
  onCompleteCheckout,
  onCancel
}) {
  const menuIdx = useMenuIndex(menuItems);
  const [paymentMode, setPaymentMode] = useState("Cash"); // Cash, UPI, Card, Split, Pending
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Cash Payment State
  const [cashReceived, setCashReceived] = useState("");

  // Split Payment State
  const [splitCash, setSplitCash] = useState("");
  const [splitUpi, setSplitUpi] = useState("");
  const [splitCard, setSplitCard] = useState("");

  // Discount & GST State
  const [discountType, setDiscountType] = useState("percent"); // "percent" or "amount"
  const [discountValue, setDiscountValue] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [managerApproved, setManagerApproved] = useState(false);
  const [gstOn, setGstOn] = useState(true);

  // Customer & Loyalty State
  const [phone, setPhone] = useState("");
  const [custName, setCustName] = useState(customerName);
  const [redeemPoints, setRedeemPoints] = useState(false);

  // Raw Subtotal Calculation
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const mi = menuIdx.get(item.menuItemId);
      return sum + (mi?.price || 0) * item.qty;
    }, 0);
  }, [cart, menuIdx]);

  // Discount Amount Calculation
  const discountAmount = useMemo(() => {
    const val = parseFloat(discountValue) || 0;
    if (val <= 0) return 0;
    if (discountType === "percent") {
      const pct = Math.min(100, Math.max(0, val));
      return Math.min(subtotal, Math.round((subtotal * pct) / 100));
    }
    return Math.min(subtotal, Math.max(0, val));
  }, [subtotal, discountType, discountValue]);

  // Net after Discount
  const netSubtotal = Math.max(0, subtotal - discountAmount);

  // GST Calculation (5%)
  const gstAmount = useMemo(() => {
    return gstOn ? Math.round(netSubtotal * 0.05) : 0;
  }, [netSubtotal, gstOn]);

  // Loyalty Point Matching
  const matchedCustomer = useMemo(() => {
    return phone.length >= 6 ? customers.find((c) => c.phone === phone) : null;
  }, [phone, customers]);

  const pointsValue = matchedCustomer 
    ? Math.min(matchedCustomer.points || 0, Math.floor(netSubtotal + gstAmount)) 
    : 0;

  const pointsDeduction = redeemPoints ? pointsValue : 0;

  // Unrounded Total
  const rawTotal = Math.max(0, netSubtotal + gstAmount - pointsDeduction);

  // Round Off & Grand Total
  const grandTotal = Math.round(rawTotal);
  const roundOff = Math.round((grandTotal - rawTotal) * 100) / 100;

  // Cash Change Calculation (PART 5)
  const cashNum = parseFloat(cashReceived) || 0;
  const cashChange = cashNum > 0 ? Math.max(0, cashNum - grandTotal) : 0;
  const isCashUnderpaid = paymentMode === "Cash" && cashNum > 0 && cashNum < grandTotal;

  // Split Payment Total Calculation (PART 8)
  const splitCashNum = Math.max(0, parseFloat(splitCash) || 0);
  const splitUpiNum = Math.max(0, parseFloat(splitUpi) || 0);
  const splitCardNum = Math.max(0, parseFloat(splitCard) || 0);
  const splitSum = splitCashNum + splitUpiNum + splitCardNum;
  const splitDiff = Math.round((grandTotal - splitSum) * 100) / 100;

  // Validation
  const canSubmit = useMemo(() => {
    if (cart.length === 0 || isSubmitting) return false;
    if (paymentMode === "Split") {
      return Math.abs(splitDiff) < 0.01 && splitSum > 0; // Cash + UPI + Card must equal Grand Total
    }
    if (paymentMode === "Cash" && paymentMode !== "Pending") {
      if (cashNum > 0 && cashNum < grandTotal) return false; // Block cash underpayment for Paid status
    }
    if (discountAmount > 0 && !discountReason.trim() && !managerApproved) {
      return false; // Require discount reason or manager approval
    }
    return true;
  }, [cart, isSubmitting, paymentMode, splitDiff, splitSum, cashNum, grandTotal, discountAmount, discountReason, managerApproved]);

  const handleCheckoutSubmit = (status = "Paid") => {
    if ((!canSubmit && status !== "Pending") || isSubmitting) return;

    setIsSubmitting(true);

    let finalPaymentDetails = paymentMode;
    if (paymentMode === "Split") {
      finalPaymentDetails = `Split (Cash: ₹${splitCashNum}, UPI: ₹${splitUpiNum}, Card: ₹${splitCardNum})`;
    }

    const billData = {
      source: sourceTitle,
      customerName: custName.trim() || "Walk-in Guest",
      phone: phone.trim(),
      items: cart.map((c) => {
        const mi = menuIdx.get(c.menuItemId);
        return {
          menuItemId: c.menuItemId,
          name: mi?.name || "Item",
          price: mi?.price || 0,
          qty: c.qty,
          notes: c.notes || ""
        };
      }),
      subtotal,
      discount: discountAmount,
      discountType,
      discountValue: parseFloat(discountValue) || 0,
      discountReason: discountReason.trim() || (managerApproved ? "Manager Discount" : ""),
      managerApproved,
      gst: gstAmount,
      roundOff,
      grandTotal,
      pointsRedeemed: pointsDeduction,
      paymentMode: finalPaymentDetails,
      status: paymentMode === "Pending" ? "Pending" : status,
      paidAt: new Date().toISOString()
    };

    try {
      onCompleteCheckout(billData);
    } finally {
      setTimeout(() => setIsSubmitting(false), 500); // Double click protection delay
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-stone-950 text-stone-100 rounded-2xl border border-stone-800 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 bg-stone-900 border-b border-stone-800 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-lg font-serif font-bold text-stone-50">{sourceTitle} Checkout</h2>
          <p className="text-xs text-stone-400">{cart.length} item{cart.length !== 1 ? "s" : ""} selected</p>
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-2 text-xs rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Line Items & Customer Details */}
        <div className="flex flex-col gap-4">
          {/* Items Summary */}
          <Card className="p-4 bg-stone-900/60 border border-stone-800 flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Order Items</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {cart.map((item, idx) => {
                const mi = menuIdx.get(item.menuItemId);
                return (
                  <div key={idx} className="flex justify-between items-start text-xs border-b border-stone-800/60 pb-1.5">
                    <div>
                      <span className="font-medium text-stone-200">{mi?.name || "Item"}</span>
                      <span className="text-stone-500 font-bold ml-1.5">×{item.qty}</span>
                      {item.notes && <span className="block text-[11px] text-amber-400 italic">Note: {item.notes}</span>}
                    </div>
                    <span className="font-mono text-stone-300">{currency((mi?.price || 0) * item.qty)}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Customer & Loyalty Panel */}
          <Card className="p-4 bg-stone-900/60 border border-stone-800 flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Customer & Loyalty</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                placeholder="Customer Name"
                className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="Phone (10 digits)"
                className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {matchedCustomer && matchedCustomer.points > 0 && (
              <label className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-600/30 p-2.5 text-xs text-amber-300 cursor-pointer">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={redeemPoints}
                    onChange={(e) => setRedeemPoints(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  Redeem {matchedCustomer.points} pts (Save {currency(pointsValue)})
                </span>
              </label>
            )}
          </Card>

          {/* Discount & GST Controls */}
          <Card className="p-4 bg-stone-900/60 border border-stone-800 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <SlidersHorizontal size={14} /> Discounts & Taxes
              </h3>
              <button
                type="button"
                onClick={() => setGstOn(!gstOn)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  gstOn ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-stone-800 text-stone-500"
                }`}
              >
                GST 5%: {gstOn ? "ON" : "OFF"}
              </button>
            </div>

            <div className="flex gap-2 items-center">
              <div className="flex bg-stone-950 rounded-xl border border-stone-800 p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setDiscountType("percent")}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer ${discountType === "percent" ? "bg-amber-500 text-stone-950" : "text-stone-400"}`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType("amount")}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer ${discountType === "amount" ? "bg-amber-500 text-stone-950" : "text-stone-400"}`}
                >
                  ₹
                </button>
              </div>

              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "percent" ? "Discount % (e.g. 10)" : "Discount Amount ₹"}
                className="flex-1 rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {parseFloat(discountValue) > 0 && (
              <div className="flex flex-col gap-2 pt-1">
                <input
                  type="text"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  placeholder="Discount reason required (e.g. Festival, Staff)"
                  className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
                
                <label className="flex items-center gap-2 text-xs text-stone-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={managerApproved}
                    onChange={(e) => setManagerApproved(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  <ShieldCheck size={14} className={managerApproved ? "text-emerald-400" : "text-stone-500"} />
                  Manager Approval Verified
                </label>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Payment Method & Totals */}
        <div className="flex flex-col justify-between gap-4">
          {/* Payment Method Selector */}
          <Card className="p-4 bg-stone-900/60 border border-stone-800 flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Payment Method</h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: "Cash", label: "Cash", icon: DollarSign },
                { id: "UPI", label: "UPI / QR", icon: QrCode },
                { id: "Card", label: "Card", icon: CreditCard },
                { id: "Split", label: "Split Pay", icon: SlidersHorizontal },
                { id: "Pending", label: "Pending", icon: AlertCircle }
              ].map((pm) => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setPaymentMode(pm.id)}
                  className={`min-h-[48px] rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition active:scale-95 cursor-pointer ${
                    paymentMode === pm.id
                      ? "bg-amber-500 text-stone-950 border-amber-400 shadow-md shadow-amber-500/20"
                      : "bg-stone-900 text-stone-300 border-stone-800 hover:bg-stone-800"
                  }`}
                >
                  <pm.icon size={16} /> {pm.label}
                </button>
              ))}
            </div>

            {/* Mode-Specific Cash Received & Validation */}
            {paymentMode === "Cash" && (
              <div className="mt-2 bg-stone-950 p-3 rounded-xl border border-stone-800 flex flex-col gap-2">
                <label className="text-xs text-stone-400">Cash Received from Customer</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder={`e.g. ${grandTotal}`}
                    className="flex-1 rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-sm font-mono font-bold text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                  />
                  {cashNum > 0 && (
                    <div className={`px-3 py-2 rounded-xl text-right border ${
                      isCashUnderpaid
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    }`}>
                      <span className="text-[10px] block uppercase font-bold">
                        {isCashUnderpaid ? "Short" : "Change Due"}
                      </span>
                      <span className="text-sm font-mono font-bold">
                        {currency(isCashUnderpaid ? grandTotal - cashNum : cashChange)}
                      </span>
                    </div>
                  )}
                </div>
                {isCashUnderpaid && (
                  <p className="text-[11px] text-rose-400 font-semibold flex items-center gap-1">
                    <AlertCircle size={12} /> Cash received must be at least {currency(grandTotal)}
                  </p>
                )}
              </div>
            )}

            {/* Split Payment Options */}
            {paymentMode === "Split" && (
              <div className="mt-2 bg-stone-950 p-3 rounded-xl border border-stone-800 flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-stone-400 font-semibold">Split Breakdown</span>
                  <span className={`text-xs font-mono font-bold ${Math.abs(splitDiff) < 0.01 ? "text-emerald-400" : "text-rose-400"}`}>
                    {Math.abs(splitDiff) < 0.01 ? "✓ Balanced" : `Diff: ${currency(splitDiff)}`}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-stone-500 block mb-0.5">Cash ₹</label>
                    <input
                      type="number"
                      value={splitCash}
                      onChange={(e) => setSplitCash(e.target.value)}
                      placeholder="0"
                      className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2 py-1.5 text-xs text-stone-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-500 block mb-0.5">UPI ₹</label>
                    <input
                      type="number"
                      value={splitUpi}
                      onChange={(e) => setSplitUpi(e.target.value)}
                      placeholder="0"
                      className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2 py-1.5 text-xs text-stone-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-500 block mb-0.5">Card ₹</label>
                    <input
                      type="number"
                      value={splitCard}
                      onChange={(e) => setSplitCard(e.target.value)}
                      placeholder="0"
                      className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2 py-1.5 text-xs text-stone-100 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Grand Totals Card */}
          <Card className="p-4 bg-stone-900 border border-stone-800 flex flex-col gap-2">
            <div className="flex justify-between text-xs text-stone-400">
              <span>Subtotal</span>
              <span>{currency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs text-rose-400 font-medium">
                <span>Discount</span>
                <span>-{currency(discountAmount)}</span>
              </div>
            )}
            {gstAmount > 0 && (
              <div className="flex justify-between text-xs text-stone-400">
                <span>GST (5%)</span>
                <span>{currency(gstAmount)}</span>
              </div>
            )}
            {roundOff !== 0 && (
              <div className="flex justify-between text-xs text-stone-500">
                <span>Round Off</span>
                <span>{roundOff > 0 ? `+${currency(roundOff)}` : currency(roundOff)}</span>
              </div>
            )}
            {pointsDeduction > 0 && (
              <div className="flex justify-between text-xs text-amber-400">
                <span>Points Redeemed</span>
                <span>-{currency(pointsDeduction)}</span>
              </div>
            )}

            <div className="border-t border-stone-800 pt-3 mt-1 flex justify-between items-center">
              <div>
                <span className="text-xs uppercase font-bold text-stone-400 tracking-wider block">Grand Total</span>
                <span className="text-2xl font-extrabold text-amber-400 font-serif">{currency(grandTotal)}</span>
              </div>

              {/* Checkout Button with Double Submission Protection */}
              <PrimaryButton
                disabled={!canSubmit || isSubmitting}
                onClick={() => handleCheckoutSubmit(paymentMode === "Pending" ? "Pending" : "Paid")}
                className="min-h-[48px] px-6 text-sm font-bold shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
              >
                {isSubmitting ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <>
                    <Check size={18} /> {paymentMode === "Pending" ? "Mark Pending" : "Complete Pay"}
                  </>
                )}
              </PrimaryButton>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
