import { Clock, Zap } from "lucide-react";
import { Card } from "../ui.jsx";
import { currency } from "../../lib/currency.js";
import { aggregateHourlyPerformance } from "../../lib/reportsAggregate.js";

export function ReportsPeakHours({ orders = [] }) {
  const { hourly, peakHour } = aggregateHourlyPerformance(orders);
  const maxOrders = Math.max(...hourly.map((h) => h.orders), 1);

  return (
    <Card className="p-4 bg-stone-900 border-stone-800 flex flex-col gap-3 shadow-md">
      <div className="flex justify-between items-center border-b border-stone-800 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-2">
          <Clock size={16} className="text-amber-500" /> Peak Operating Hours
        </h3>

        {peakHour && (
          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-xl flex items-center gap-1 font-mono">
            <Zap size={13} /> Peak: {peakHour.label} ({peakHour.orders} orders • {currency(peakHour.revenue)})
          </span>
        )}
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {hourly.filter((h) => h.orders > 0 || (h.hour >= 8 && h.hour <= 22)).map((h) => {
          const pct = Math.round((h.orders / maxOrders) * 100);
          const isPeak = peakHour && peakHour.hour === h.hour && h.orders > 0;

          return (
            <div key={h.hour} className="flex items-center gap-3 text-xs">
              <span className="w-16 font-mono text-[11px] text-stone-400 shrink-0">{h.label}</span>

              <div className="flex-1 bg-stone-950 rounded-full h-4 overflow-hidden border border-stone-800 relative">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    isPeak ? "bg-amber-500 shadow-lg shadow-amber-500/30" : "bg-stone-700"
                  }`} 
                  style={{ width: `${pct}%` }} 
                />
              </div>

              <span className="font-mono text-[11px] w-28 text-right text-stone-300 font-bold shrink-0">
                {h.orders} orders ({currency(h.revenue)})
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
