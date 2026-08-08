import { CreditCard, DollarSign, QrCode, SlidersHorizontal, Clock } from "lucide-react";
import { Card } from "../ui.jsx";
import { currency } from "../../lib/currency.js";
import { aggregatePaymentBreakdown } from "../../lib/reportsAggregate.js";

export function ReportsPaymentAnalytics({ orders = [] }) {
  const { modes, totalAmount } = aggregatePaymentBreakdown(orders);
  const totalSafe = totalAmount || 1;

  const modeList = [
    { id: "Cash", label: "Cash", icon: DollarSign, data: modes.Cash, tone: "text-emerald-400" },
    { id: "UPI", label: "UPI / QR", icon: QrCode, data: modes.UPI, tone: "text-sky-400" },
    { id: "Card", label: "Card", icon: CreditCard, data: modes.Card, tone: "text-purple-400" },
    { id: "Split", label: "Split Pay", icon: SlidersHorizontal, data: modes.Split, tone: "text-amber-400" },
    { id: "Pending", label: "Pending", icon: Clock, data: modes.Pending, tone: "text-rose-400" }
  ];

  return (
    <Card className="p-4 bg-stone-900 border-stone-800 flex flex-col gap-3 shadow-md">
      <div className="flex justify-between items-center border-b border-stone-800 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-2">
          <CreditCard size={16} className="text-amber-500" /> Payment Methods Breakdown
        </h3>
      </div>

      <div className="space-y-2">
        {modeList.map((m) => {
          const pct = Math.round((m.data.amount / totalSafe) * 100);
          return (
            <div key={m.id} className="bg-stone-950 p-2.5 rounded-xl border border-stone-800 flex flex-col gap-1 text-xs">
              <div className="flex justify-between items-center">
                <span className={`font-bold flex items-center gap-1.5 ${m.tone}`}>
                  <m.icon size={13} /> {m.label}
                </span>
                <span className="font-mono font-bold text-stone-200">{currency(m.data.amount)} ({pct}%)</span>
              </div>

              <div className="w-full bg-stone-900 rounded-full h-2 overflow-hidden border border-stone-800/80">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    m.id === "Cash" ? "bg-emerald-500" :
                    m.id === "UPI" ? "bg-sky-500" :
                    m.id === "Card" ? "bg-purple-500" :
                    m.id === "Split" ? "bg-amber-500" : "bg-rose-500"
                  }`} 
                  style={{ width: `${pct}%` }} 
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
