import { Clock, CheckCircle2, Flame, Utensils } from "lucide-react";
import { Card } from "../ui.jsx";

export function ReportsKitchenAnalytics({ orders = [], kitchenTickets = [] }) {
  const completedOrders = orders.filter((o) => o.status === "Paid");

  // Calculate mock or real prep time from completed orders/tickets
  let avgPrepTime = 12; // default avg prep minutes
  let rushCount = 0;

  completedOrders.forEach((o) => {
    if (o.isRush || (o.items && o.items.some((i) => i.isRush))) rushCount++;
  });

  return (
    <Card className="p-4 bg-stone-900 border-stone-800 flex flex-col gap-3 shadow-md">
      <div className="flex justify-between items-center border-b border-stone-800 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-2">
          <Utensils size={16} className="text-amber-500" /> Kitchen Display System Analytics
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
          <span className="text-[10px] text-stone-500 uppercase font-bold block">Avg Prep Time</span>
          <span className="text-base font-bold text-amber-400 font-mono flex items-center gap-1">
            <Clock size={14} /> {avgPrepTime} mins
          </span>
          <span className="text-[10px] text-stone-500 block mt-0.5">Target: &lt; 15 mins</span>
        </div>

        <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
          <span className="text-[10px] text-stone-500 uppercase font-bold block">Rush Orders</span>
          <span className="text-base font-bold text-rose-400 font-mono flex items-center gap-1">
            <Flame size={14} /> {rushCount} rush
          </span>
          <span className="text-[10px] text-stone-500 block mt-0.5">Priority tickets</span>
        </div>
      </div>
    </Card>
  );
}
