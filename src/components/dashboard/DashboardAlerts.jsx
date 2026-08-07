import { useMemo } from "react";
import { Coffee, ChefHat, AlertTriangle, Package, Users, PackageX, Activity, CheckCircle2 } from "lucide-react";
import { Card, Pill } from "../ui/index.js";

export function DashboardAlerts({ state }) {
  const { tables = [], parcels = [], users = [], inventory = [] } = state || {};

  const totalTables = tables.length;
  const availableTables = useMemo(() => (tables || []).filter((t) => t && t.status === "available").length, [tables]);
  const occupiedTables = useMemo(() => (tables || []).filter((t) => t && t.status === "occupied").length, [tables]);
  const pendingBills = useMemo(() => (tables || []).filter((t) => t && t.status === "payment_pending").length, [tables]);

  const activeKitchen = useMemo(() => {
    return (tables || []).filter((t) => t && t.status === "occupied" && t.items && t.items.length > 0).length;
  }, [tables]);

  const readyOrders = useMemo(() => {
    return (tables || []).filter((t) => t && t.kitchenStatus === "Ready").length;
  }, [tables]);

  const activeParcels = useMemo(() => {
    return (parcels || []).filter((p) => p && p.status !== "delivered" && p.status !== "cancelled").length;
  }, [parcels]);

  const lowStockItems = useMemo(() => {
    return (inventory || []).filter((item) => item && (item.currentStock || 0) <= (item.minStock || 5));
  }, [inventory]);

  const operationalMetrics = [
    {
      id: "open_tables",
      label: "Open Tables",
      value: availableTables,
      sub: `${totalTables} total tables`,
      icon: Coffee,
      tone: "emerald",
      badgeText: "Available",
      badgeColor: "text-emerald-400 bg-emerald-950/80 border-emerald-800/60",
    },
    {
      id: "occupied_tables",
      label: "Occupied Tables",
      value: occupiedTables,
      sub: `${Math.round((occupiedTables / (totalTables || 1)) * 100)}% occupancy`,
      icon: Coffee,
      tone: "amber",
      badgeText: "In Service",
      badgeColor: "text-amber-400 bg-amber-950/80 border-amber-800/60",
    },
    {
      id: "kitchen_waiting",
      label: "Kitchen Waiting",
      value: activeKitchen,
      sub: activeKitchen === 0 ? "Queue cleared" : "Cooking live",
      icon: ChefHat,
      tone: "purple",
      badgeText: "Active KDS",
      badgeColor: "text-purple-300 bg-purple-950/80 border-purple-800/60",
    },
    {
      id: "ready_orders",
      label: "Ready Orders",
      value: readyOrders,
      sub: readyOrders === 0 ? "None awaiting pickup" : "Ready to serve",
      icon: CheckCircle2,
      tone: "sky",
      badgeText: "Serve Now",
      badgeColor: "text-sky-300 bg-sky-950/80 border-sky-800/60",
    },
    {
      id: "pending_bills",
      label: "Pending Bills",
      value: pendingBills,
      sub: pendingBills === 0 ? "All bills cleared" : "Awaiting payment",
      icon: AlertTriangle,
      tone: "rose",
      badgeText: "Unpaid",
      badgeColor: "text-rose-300 bg-rose-950/80 border-rose-800/60",
    },
    {
      id: "parcels",
      label: "Parcel Orders",
      value: activeParcels,
      sub: `${parcels.length} total takeaway today`,
      icon: Package,
      tone: "amber",
      badgeText: "Takeaway",
      badgeColor: "text-amber-300 bg-amber-950/80 border-amber-800/60",
    },
    {
      id: "low_stock",
      label: "Low Stock Items",
      value: lowStockItems.length,
      sub: lowStockItems.length === 0 ? "Inventory healthy" : "Reorder required",
      icon: PackageX,
      tone: "rose",
      badgeText: lowStockItems.length > 0 ? "Alert" : "OK",
      badgeColor: lowStockItems.length > 0 ? "text-rose-300 bg-rose-950/80 border-rose-800/60" : "text-emerald-300 bg-emerald-950/80 border-emerald-800/60",
    },
  ];

  return (
    <Card className="p-5 border border-stone-800 bg-stone-900 shadow-md rounded-2xl">
      <div className="flex justify-between items-center border-b border-stone-800 pb-3 mb-4">
        <div>
          <h3 className="font-semibold text-stone-100 text-base flex items-center gap-2">
            <Activity size={18} className="text-amber-400" /> Live Operational Status
          </h3>
          <p className="text-xs text-stone-400 mt-0.5">Real-time floor & kitchen metrics</p>
        </div>
        <span className="text-xs text-stone-400 flex items-center gap-1.5 bg-stone-950/80 border border-stone-800 px-2.5 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Feed
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {operationalMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.id}
              className="bg-stone-850/80 border border-stone-800 rounded-xl p-3.5 flex flex-col justify-between hover:border-stone-750 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-400 truncate">
                  {metric.label}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${metric.badgeColor}`}>
                  {metric.badgeText}
                </span>
              </div>

              <div className="my-2">
                <span className="text-2xl font-extrabold text-stone-50">
                  {metric.value}
                </span>
              </div>

              <p className="text-[11px] text-stone-400 truncate font-medium border-t border-stone-800/60 pt-1.5">
                {metric.sub}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
