import { useMemo } from "react";
import { Clock, CheckCircle2, ListOrdered, Flame } from "lucide-react";
import { Card } from "../ui.jsx";
import { getKitchenAnalytics } from "../../lib/reportsAggregate.js";

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

export function ReportsKitchenAnalytics({ orders }) {
  const stats = useMemo(() => getKitchenAnalytics(orders), [orders]);

  return (
    <Card className="p-4 flex flex-col gap-4">
      <h3 className="font-serif text-lg font-bold text-stone-50">Kitchen Performance</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MiniStat label="Avg Prep Time" value={`${stats.avgPrepTime} m`} icon={Clock} accent="text-amber-500" />
        <MiniStat label="In Progress" value={stats.inProgress} icon={ListOrdered} accent="text-sky-500" />
        <MiniStat label="Completed" value={stats.completed} icon={CheckCircle2} accent="text-emerald-500" />
        <MiniStat label="Longest Wait" value={`${stats.longestWait} m`} icon={Flame} accent="text-rose-500" />
      </div>
    </Card>
  );
}
