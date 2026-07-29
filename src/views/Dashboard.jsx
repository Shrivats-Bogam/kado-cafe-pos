import { useMemo } from "react";
import {
  BarChart3, ShoppingCart, Package, Coffee, AlertTriangle, ChefHat,
} from "lucide-react";
import { Card, StatCard } from "../components/ui.jsx";
import { currency, isToday, isThisMonth } from "../lib/currency.js";
import { topSellers } from "../lib/aggregate.js";

export default function Dashboard({ state }) {
  const todayOrders = state.orderHistory.filter((o) => isToday(o.paidAt));
  const revenueToday = todayOrders.reduce((s, o) => s + (o.grandTotal || 0), 0);
  const parcelToday = state.parcels.filter((p) => isToday(p.createdAt)).length;
  const available = state.tables.filter((t) => t.status === "available").length;
  const occupied = state.tables.length - available;
  const pending = state.tables.filter((t) => t.status === "payment_pending").length;
  const monthRevenue = state.orderHistory
    .filter((o) => isThisMonth(o.paidAt))
    .reduce((s, o) => s + (o.grandTotal || 0), 0);

  const bestSeller = useMemo(
    () => topSellers(state.orderHistory, state.menuItems, 1)[0]?.name || "—",
    [state.orderHistory, state.menuItems]
  );

  const recent = [...state.orderHistory]
    .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Today's Revenue" value={currency(revenueToday)} icon={BarChart3} />
        <StatCard label="Today's Orders" value={todayOrders.length} icon={ShoppingCart} />
        <StatCard label="Parcel Orders" value={parcelToday} icon={Package} />
        <StatCard label="Available Tables" value={available} icon={Coffee} accent="text-emerald-500" />
        <StatCard label="Occupied Tables" value={occupied} icon={Coffee} accent="text-amber-500" />
        <StatCard label="Pending Bills" value={pending} icon={AlertTriangle} accent="text-rose-500" />
        <StatCard label="Best Selling Item" value={bestSeller} icon={ChefHat} />
        <StatCard label="Monthly Revenue" value={currency(monthRevenue)} icon={BarChart3} />
      </div>

      <Card className="p-4">
        <h3 className="text-sm font-medium text-stone-300 mb-3">Recent Activity</h3>
        {recent.length === 0 && <p className="text-sm text-stone-500">No orders yet today.</p>}
        <div className="flex flex-col gap-2">
          {recent.map((o) => (
            <div
              key={o.id}
              className="flex justify-between text-sm text-stone-400 border-b border-stone-800 last:border-0 pb-2 last:pb-0"
            >
              <span>{o.source}{o.customerName ? ` · ${o.customerName}` : ""}</span>
              <span className="text-stone-200">{currency(o.grandTotal)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
