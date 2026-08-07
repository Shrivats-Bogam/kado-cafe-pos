import { useState, useMemo } from "react";
import { History, Receipt, Users, Package, ChefHat, Clock, ShieldAlert } from "lucide-react";
import { Card, Pill } from "../ui.jsx";
import { currency } from "../../lib/currency.js";

export function RecentActivity({ state }) {
  const { orderHistory = [], customers = [], parcels = [], tables = [] } = state || {};
  const [filter, setFilter] = useState("all");

  // Green: Bills
  const recentBills = useMemo(() => {
    return [...(orderHistory || [])]
      .sort((a, b) => new Date(b.paidAt || b.timestamp || 0) - new Date(a.paidAt || a.timestamp || 0))
      .slice(0, 5)
      .map((o) => ({
        id: `bill-${o.id}`,
        type: "bill",
        categoryLabel: "Bill Paid",
        title: `Bill #${o.id} ${o.source ? `(${o.source})` : ""}`,
        subtitle: o.customerName ? `Customer: ${o.customerName}` : "Walk-in Guest",
        amount: currency(o.grandTotal || o.total || 0),
        time: o.paidAt ? new Date(o.paidAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recently",
        icon: Receipt,
        badgeStyle: "bg-emerald-500/20 text-emerald-400 border-emerald-800/50",
        iconStyle: "bg-emerald-500/20 text-emerald-400 border-emerald-800/40",
      }));
  }, [orderHistory]);

  // Blue: Customers
  const recentCustomers = useMemo(() => {
    return [...(customers || [])]
      .slice(-5)
      .reverse()
      .map((c) => ({
        id: `cust-${c.id}`,
        type: "customer",
        categoryLabel: "Customer",
        title: `New Customer: ${c.name}`,
        subtitle: `Phone: ${c.phone || "N/A"} • ${c.points || 0} pts`,
        amount: `${c.totalOrders || 0} visits`,
        time: c.lastVisit ? new Date(c.lastVisit).toLocaleDateString() : "New",
        icon: Users,
        badgeStyle: "bg-blue-500/20 text-blue-400 border-blue-800/50",
        iconStyle: "bg-blue-500/20 text-blue-400 border-blue-800/40",
      }));
  }, [customers]);

  // Orange: Parcels
  const recentParcels = useMemo(() => {
    return [...(parcels || [])]
      .slice(-5)
      .reverse()
      .map((p) => ({
        id: `parcel-${p.id}`,
        type: "parcel",
        categoryLabel: "Parcel Order",
        title: `Takeaway #${p.id || "Parcel"}`,
        subtitle: p.customerName ? `${p.customerName} (${p.phone || ""})` : "Takeaway Guest",
        amount: currency(p.total || 0),
        time: p.createdAt ? new Date(p.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recent",
        icon: Package,
        badgeStyle: "bg-amber-500/20 text-amber-400 border-amber-800/50",
        iconStyle: "bg-amber-500/20 text-amber-400 border-amber-800/40",
      }));
  }, [parcels]);

  // Purple: Kitchen
  const activeKitchen = useMemo(() => {
    return (tables || [])
      .filter((t) => t && t.status === "occupied" && t.items && t.items.length > 0)
      .map((t) => ({
        id: `kitchen-t${t.id}`,
        type: "kitchen",
        categoryLabel: "Kitchen Ticket",
        title: `Table #${t.number} KDS Ticket`,
        subtitle: `${t.items.length} item${t.items.length > 1 ? "s" : ""} in preparation`,
        amount: t.kitchenStatus || "Preparing",
        time: t.startedAt ? new Date(t.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Active",
        icon: ChefHat,
        badgeStyle: "bg-purple-500/20 text-purple-300 border-purple-800/50",
        iconStyle: "bg-purple-500/20 text-purple-400 border-purple-800/40",
      }));
  }, [tables]);

  // Combined Activity Feed
  const combinedActivities = useMemo(() => {
    let items = [];
    if (filter === "all") {
      items = [...recentBills, ...recentCustomers, ...recentParcels, ...activeKitchen];
    } else if (filter === "bills") {
      items = recentBills;
    } else if (filter === "customers") {
      items = recentCustomers;
    } else if (filter === "parcels") {
      items = recentParcels;
    } else if (filter === "kitchen") {
      items = activeKitchen;
    }
    return items.slice(0, 8);
  }, [filter, recentBills, recentCustomers, recentParcels, activeKitchen]);

  return (
    <Card className="p-5 border border-stone-800 bg-stone-900 shadow-md rounded-2xl">
      {/* Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-stone-800 pb-3 mb-4">
        <div>
          <h3 className="font-semibold text-stone-100 text-base flex items-center gap-2">
            <History size={18} className="text-amber-400" /> Recent Live Activity
          </h3>
          <p className="text-xs text-stone-400 mt-0.5">Color-coded real-time operation log</p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            { id: "all", label: "All Activity" },
            { id: "bills", label: "🟢 Bills" },
            { id: "customers", label: "🔵 Customers" },
            { id: "parcels", label: "🟠 Parcels" },
            { id: "kitchen", label: "🟣 Kitchen" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`px-3 py-1 rounded-full font-semibold transition-all shrink-0 border ${
                filter === item.id
                  ? "bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-xs"
                  : "bg-stone-850 border-stone-800 text-stone-400 hover:text-stone-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      {combinedActivities.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-stone-500 space-y-2">
          <Clock size={28} className="text-stone-600" />
          <p className="text-xs">No recent activity logged under this filter.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {combinedActivities.map((act) => {
            const Icon = act.icon;
            return (
              <div
                key={act.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-stone-850/80 border border-stone-800 hover:border-stone-750 transition-all group"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* Icon */}
                  <div className={`p-2.5 rounded-xl border ${act.iconStyle} shrink-0`}>
                    <Icon size={18} />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-stone-100 group-hover:text-amber-300 transition-colors truncate">
                        {act.title}
                      </p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${act.badgeStyle} shrink-0`}>
                        {act.categoryLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 truncate mt-0.5">
                      {act.subtitle}
                    </p>
                  </div>
                </div>

                {/* Amount & Timestamp */}
                <div className="text-right shrink-0 ml-3">
                  <p className="text-xs font-bold text-stone-100">{act.amount}</p>
                  <p className="text-[11px] text-stone-400 mt-0.5 font-medium">{act.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
