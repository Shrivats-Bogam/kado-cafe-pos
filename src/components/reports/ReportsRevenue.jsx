import { DollarSign, ShoppingCart, Coffee, Clock, Undo2, Percent } from "lucide-react";
import { Card } from "../ui.jsx";
import { currency } from "../../lib/currency.js";
import { computeRevenueMetrics, computeGrowth } from "../../lib/reportsAggregate.js";

export function ReportsRevenue({ orders = [], previousOrders = [], comparisonLabel = "" }) {
  const current = computeRevenueMetrics(orders);
  const previous = computeRevenueMetrics(previousOrders);

  const revenueGrowth = computeGrowth(current.paidRevenue, previous.paidRevenue);
  const ordersGrowth = computeGrowth(current.paidCount, previous.paidCount);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Card className="p-3.5 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-xs">
        <div className="flex items-center justify-between text-stone-400">
          <span className="text-[10px] font-bold uppercase tracking-wider">Net Revenue</span>
          <DollarSign size={16} className="text-emerald-500" />
        </div>
        <span className="text-xl font-bold text-emerald-400 font-serif">{currency(current.paidRevenue)}</span>
        <span className="text-[10px] text-stone-500 font-medium truncate">
          {revenueGrowth.pct !== null ? revenueGrowth.label : comparisonLabel || "Current Period"}
        </span>
      </Card>

      <Card className="p-3.5 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-xs">
        <div className="flex items-center justify-between text-stone-400">
          <span className="text-[10px] font-bold uppercase tracking-wider">Paid Bills</span>
          <ShoppingCart size={16} className="text-amber-500" />
        </div>
        <span className="text-xl font-bold text-stone-50 font-serif">{current.paidCount}</span>
        <span className="text-[10px] text-stone-500 font-medium truncate">
          {ordersGrowth.pct !== null ? ordersGrowth.label : `${current.totalOrders} total orders`}
        </span>
      </Card>

      <Card className="p-3.5 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-xs">
        <div className="flex items-center justify-between text-amber-400">
          <span className="text-[10px] font-bold uppercase tracking-wider">Avg Bill Value (AOV)</span>
          <Coffee size={16} />
        </div>
        <span className="text-xl font-bold text-amber-400 font-serif">{currency(current.aov)}</span>
        <span className="text-[10px] text-stone-500 font-medium">Per paid bill</span>
      </Card>

      <Card className="p-3.5 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-xs">
        <div className="flex items-center justify-between text-sky-400">
          <span className="text-[10px] font-bold uppercase tracking-wider">Pending Revenue</span>
          <Clock size={16} />
        </div>
        <span className="text-xl font-bold text-sky-300 font-serif">{currency(current.pendingRevenue)}</span>
        <span className="text-[10px] text-stone-500 font-medium">{current.pendingCount} pending bill(s)</span>
      </Card>

      <Card className="p-3.5 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-xs">
        <div className="flex items-center justify-between text-purple-400">
          <span className="text-[10px] font-bold uppercase tracking-wider">Discounts Given</span>
          <Percent size={16} />
        </div>
        <span className="text-xl font-bold text-purple-300 font-serif">{currency(current.totalDiscounts)}</span>
        <span className="text-[10px] text-stone-500 font-medium">Applied discounts</span>
      </Card>

      <Card className="p-3.5 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-xs">
        <div className="flex items-center justify-between text-rose-400">
          <span className="text-[10px] font-bold uppercase tracking-wider">Refunds / Cancelled</span>
          <Undo2 size={16} />
        </div>
        <span className="text-xl font-bold text-rose-400 font-serif">{currency(current.cancelledRevenue)}</span>
        <span className="text-[10px] text-stone-500 font-medium">{current.cancelledCount} order(s)</span>
      </Card>
    </div>
  );
}
