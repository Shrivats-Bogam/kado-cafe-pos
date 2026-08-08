import { Table, ShoppingBag } from "lucide-react";
import { Card } from "../ui.jsx";
import { currency } from "../../lib/currency.js";
import { aggregateChannelPerformance } from "../../lib/reportsAggregate.js";

export function ReportsTableAnalytics({ orders = [] }) {
  const { tableOrders, tableRevenue, parcelOrders, parcelRevenue, tableList } = aggregateChannelPerformance(orders);
  const totalRev = tableRevenue + parcelRevenue || 1;

  const tablePct = Math.round((tableRevenue / totalRev) * 100);
  const parcelPct = Math.round((parcelRevenue / totalRev) * 100);

  return (
    <Card className="p-4 bg-stone-900 border-stone-800 flex flex-col gap-3 shadow-md">
      <div className="flex justify-between items-center border-b border-stone-800 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-2">
          <Table size={16} className="text-amber-500" /> Channel Performance (Dine-in vs Parcel)
        </h3>
      </div>

      {/* Channel Comparison */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 flex flex-col gap-1">
          <div className="flex items-center justify-between text-stone-400 font-bold">
            <span className="flex items-center gap-1"><Table size={13} className="text-amber-500" /> Dine-in Tables</span>
            <span className="font-mono text-amber-400">{tablePct}%</span>
          </div>
          <span className="text-base font-bold text-stone-100 font-serif">{currency(tableRevenue)}</span>
          <span className="text-[10px] text-stone-500 font-mono">{tableOrders} orders</span>
        </div>

        <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 flex flex-col gap-1">
          <div className="flex items-center justify-between text-stone-400 font-bold">
            <span className="flex items-center gap-1"><ShoppingBag size={13} className="text-purple-400" /> Takeaway Parcel</span>
            <span className="font-mono text-purple-300">{parcelPct}%</span>
          </div>
          <span className="text-base font-bold text-stone-100 font-serif">{currency(parcelRevenue)}</span>
          <span className="text-[10px] text-stone-500 font-mono">{parcelOrders} orders</span>
        </div>
      </div>

      {/* Table Breakdown List */}
      {tableList.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] uppercase font-bold text-stone-500 block">Top Dine-in Tables</span>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {tableList.slice(0, 5).map((t) => (
              <div key={t.name} className="flex justify-between items-center text-xs bg-stone-950 px-3 py-1.5 rounded-lg border border-stone-800 font-mono">
                <span className="font-bold text-stone-200">{t.name}</span>
                <span className="text-amber-400 font-bold">{currency(t.revenue)} ({t.orders} orders)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
