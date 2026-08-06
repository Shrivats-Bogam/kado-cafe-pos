import { useMemo } from "react";
import { Timer, ArrowDownUp, ArrowUpDown, Hash, Coins } from "lucide-react";
import { Card } from "../ui.jsx";
import { currency } from "../../lib/currency.js";
import { getTableAnalytics } from "../../lib/reportsAggregate.js";

function MiniStat({ label, value, icon: Icon, accent }) {
  return (
    <div className="flex items-center justify-between p-3 bg-stone-950 border border-stone-800 rounded-xl">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold text-stone-400">{label}</span>
        <span className="text-lg font-serif font-bold text-stone-50">{value}</span>
      </div>
      <div className={`p-2 rounded-lg bg-stone-800 ${accent}`}>
        <Icon size={18} />
      </div>
    </div>
  );
}

export function ReportsTableAnalytics({ orders }) {
  const stats = useMemo(() => getTableAnalytics(orders), [orders]);

  return (
    <Card className="p-4 flex flex-col gap-4">
      <h3 className="font-serif text-lg font-bold text-stone-50">Table Analytics</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MiniStat label="Avg Turnaround Time" value={stats.avgTime} icon={Timer} accent="text-amber-500" />
        <MiniStat label="Fastest Turnover" value={stats.fastest} icon={ArrowDownUp} accent="text-emerald-500" />
        <MiniStat label="Slowest Table" value={stats.slowest} icon={ArrowUpDown} accent="text-rose-500" />
        <MiniStat label="Most Used Table" value={stats.mostUsed} icon={Hash} accent="text-sky-500" />
        <MiniStat label="Avg Rev / Table" value={currency(stats.avgRevPerTable)} icon={Coins} accent="text-emerald-500" />
      </div>
    </Card>
  );
}
