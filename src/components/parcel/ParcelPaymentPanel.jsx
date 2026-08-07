import { CreditCard, CheckCircle2, Clock } from "lucide-react";

export default function ParcelPaymentPanel({ 
  isPaid, 
  setIsPaid, 
  paymentMethod, 
  setPaymentMethod 
}) {
  const methods = ["Cash", "UPI", "Card", "Split"];

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-2">
        <CreditCard size={16} className="text-amber-500" /> Payment Details
      </h3>

      {/* Paid vs Unpaid Toggle */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-stone-950 rounded-xl border border-stone-800">
        <button
          type="button"
          onClick={() => setIsPaid(true)}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition min-h-[44px] ${
            isPaid 
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-sm" 
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          <CheckCircle2 size={16} /> Paid
        </button>
        <button
          type="button"
          onClick={() => setIsPaid(false)}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition min-h-[44px] ${
            !isPaid 
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-sm" 
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          <Clock size={16} /> Unpaid
        </button>
      </div>

      {/* Payment Methods (If Paid) */}
      {isPaid && (
        <div className="flex flex-col gap-1.5 animate-fadeIn">
          <p className="text-xs text-stone-400 font-medium">Select Payment Method</p>
          <div className="grid grid-cols-4 gap-2">
            {methods.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={`py-2.5 text-xs font-semibold rounded-xl border transition min-h-[44px] ${
                  paymentMethod === m 
                    ? "bg-amber-500 text-stone-950 border-amber-500 shadow-sm" 
                    : "bg-stone-950 text-stone-300 border-stone-800 hover:border-stone-700"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
