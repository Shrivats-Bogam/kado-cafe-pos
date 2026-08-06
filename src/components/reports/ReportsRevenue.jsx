import { BarChart3, ShoppingCart, Coffee, XCircle, Undo2, Clock } from "lucide-react";
import { StatCard } from "../ui.jsx";
import { currency } from "../../lib/currency.js";
import { totalRevenue } from "../../lib/aggregate.js";
import { filterByDateRange } from "../../lib/dateUtils.js";

export function ReportsRevenue({ orders, allOrders }) {
  const currentRevenue = totalRevenue(orders);
  
  // Quick calculation for Growth vs Yesterday if we are viewing "today"
  const yesterdayOrders = filterByDateRange(allOrders, "paidAt", "yesterday");
  const yesterdayRev = totalRevenue(yesterdayOrders);
  let growth = 0;
  if (yesterdayRev > 0) {
    growth = ((currentRevenue - yesterdayRev) / yesterdayRev) * 100;
  }

  const avgOrder = orders.length ? currentRevenue / orders.length : 0;
  
  const cancelled = orders.filter(o => o.status === "Cancelled").length;
  const refunds = orders.filter(o => o.status === "Cancelled").reduce((acc, o) => acc + (o.grandTotal || 0), 0);
  const pending = orders.filter(o => o.status === "Pending").length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      <StatCard 
        label="Revenue" 
        value={currency(currentRevenue)} 
        icon={BarChart3} 
        accent="text-emerald-500"
        sub={growth ? `${growth > 0 ? "+" : ""}${growth.toFixed(1)}% vs yesterday` : ""} 
      />
      <StatCard label="Total Orders" value={orders.length} icon={ShoppingCart} accent="text-amber-500" />
      <StatCard label="Avg Bill Value" value={currency(avgOrder)} icon={Coffee} accent="text-amber-500" />
      <StatCard label="Pending Payments" value={pending} icon={Clock} accent="text-sky-500" />
      <StatCard label="Cancelled Orders" value={cancelled} icon={XCircle} accent="text-rose-500" />
      <StatCard label="Refunds" value={currency(refunds)} icon={Undo2} accent="text-rose-500" />
    </div>
  );
}
