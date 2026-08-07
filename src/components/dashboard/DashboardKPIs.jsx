import { useMemo } from "react";
import { DollarSign, ShoppingBag, Users, ChefHat, AlertTriangle, TrendingUp, TrendingDown, Clock, Info } from "lucide-react";
import { Card } from "../ui/index.js";
import { currency } from "../../lib/currency.js";

export function DashboardKPIs({ state }) {
  const { orderHistory = [], tables = [], customers = [] } = state || {};

  // Date Math for Today & Yesterday
  const { todayOrders, yesterdayOrders } = useMemo(() => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStr = today.toISOString().slice(0, 10);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const todayList = (orderHistory || []).filter((o) => o && o.paidAt && typeof o.paidAt === "string" && o.paidAt.slice(0, 10) === todayStr);
    const yesterdayList = (orderHistory || []).filter((o) => o && o.paidAt && typeof o.paidAt === "string" && o.paidAt.slice(0, 10) === yesterdayStr);

    return { todayOrders: todayList, yesterdayOrders: yesterdayList };
  }, [orderHistory]);

  const revenueToday = useMemo(() => {
    return todayOrders.reduce((sum, o) => sum + (o.grandTotal || o.total || 0), 0);
  }, [todayOrders]);

  const revenueYesterday = useMemo(() => {
    return yesterdayOrders.reduce((sum, o) => sum + (o.grandTotal || o.total || 0), 0);
  }, [yesterdayOrders]);

  // Active Kitchen Queue Count
  const kitchenQueue = useMemo(() => {
    return (tables || []).filter(
      (t) => t && t.status === "occupied" && t.items && t.items.length > 0
    ).length;
  }, [tables]);

  // Pending Bills Count
  const pendingBills = useMemo(() => {
    return (tables || []).filter((t) => t && t.status === "payment_pending").length;
  }, [tables]);

  // Unique Customers Served Today
  const customersTodayCount = useMemo(() => {
    const ids = new Set();
    todayOrders.forEach((o) => {
      if (o.customerId) ids.add(o.customerId);
      else if (o.phone) ids.add(o.phone);
    });
    return ids.size || customers.length || 0;
  }, [todayOrders, customers]);

  // Trend formatting helper
  const getRevTrend = () => {
    if (revenueYesterday === 0) {
      return {
        label: `Yesterday: ₹0`,
        isPositive: true,
        isNeutral: true,
      };
    }
    const diff = revenueToday - revenueYesterday;
    const pct = Math.round((diff / revenueYesterday) * 100);
    return {
      label: pct >= 0 ? `+${pct}% vs yesterday` : `${pct}% vs yesterday`,
      isPositive: pct >= 0,
      isNeutral: false,
    };
  };

  const getOrdersTrend = () => {
    if (yesterdayOrders.length === 0) {
      return {
        label: `Yesterday: 0 orders`,
        isPositive: true,
        isNeutral: true,
      };
    }
    const diff = todayOrders.length - yesterdayOrders.length;
    const pct = Math.round((diff / yesterdayOrders.length) * 100);
    return {
      label: pct >= 0 ? `+${pct}% vs yesterday` : `${pct}% vs yesterday`,
      isPositive: pct >= 0,
      isNeutral: false,
    };
  };

  const revTrend = getRevTrend();
  const ordersTrend = getOrdersTrend();

  const kpiData = [
    {
      id: "revenue",
      label: "Revenue Today",
      value: currency(revenueToday),
      trend: revTrend,
      sub: `Yesterday ${currency(revenueYesterday)}`,
      icon: DollarSign,
      accent: "text-amber-400",
      bgAccent: "from-amber-500/10 via-stone-900 to-stone-900",
      borderAccent: "border-amber-500/30 hover:border-amber-500/60",
    },
    {
      id: "orders",
      label: "Today's Orders",
      value: todayOrders.length,
      trend: ordersTrend,
      sub: `${todayOrders.length} completed today`,
      icon: ShoppingBag,
      accent: "text-emerald-400",
      bgAccent: "from-emerald-500/10 via-stone-900 to-stone-900",
      borderAccent: "border-emerald-500/30 hover:border-emerald-500/60",
    },
    {
      id: "customers",
      label: "Customers Served",
      value: customersTodayCount,
      trend: null,
      sub: `${customers.length} total registered`,
      icon: Users,
      accent: "text-blue-400",
      bgAccent: "from-blue-500/10 via-stone-900 to-stone-900",
      borderAccent: "border-blue-500/30 hover:border-blue-500/60",
    },
    {
      id: "kitchen",
      label: "Kitchen Queue",
      value: kitchenQueue,
      trend: null,
      sub: kitchenQueue === 0 ? "Queue cleared" : `${kitchenQueue} active ticket${kitchenQueue > 1 ? "s" : ""}`,
      icon: ChefHat,
      accent: "text-purple-400",
      bgAccent: "from-purple-500/10 via-stone-900 to-stone-900",
      borderAccent: "border-purple-500/30 hover:border-purple-500/60",
    },
    {
      id: "pending",
      label: "Pending Bills",
      value: pendingBills,
      trend: null,
      sub: pendingBills === 0 ? "No pending payments" : `${pendingBills} awaiting payment`,
      icon: AlertTriangle,
      accent: "text-rose-400",
      bgAccent: "from-rose-500/10 via-stone-900 to-stone-900",
      borderAccent: "border-rose-500/30 hover:border-rose-500/60",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
      {kpiData.map((kpi) => {
        const Icon = kpi.icon;

        return (
          <Card
            key={kpi.id}
            className={`p-5 flex flex-col justify-between bg-gradient-to-br ${kpi.bgAccent} border ${kpi.borderAccent} transition-all duration-200 shadow-md hover:shadow-xl hover:-translate-y-0.5 group rounded-2xl`}
          >
            {/* Header / Icon */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                {kpi.label}
              </span>
              <div className={`p-2.5 rounded-xl bg-stone-950/80 border border-stone-800 ${kpi.accent} shadow-inner group-hover:scale-110 transition-transform`}>
                <Icon size={20} />
              </div>
            </div>

            {/* Large Value - 3xl/4xl for maximum commercial readability */}
            <div className="my-3">
              <span className="text-3xl sm:text-4xl font-extrabold text-stone-50 tracking-tight block">
                {kpi.value}
              </span>
            </div>

            {/* Footer / Trend */}
            <div className="flex items-center justify-between text-xs pt-2.5 border-t border-stone-800/80 mt-1">
              <span className="text-stone-300 font-medium truncate">{kpi.sub}</span>

              {kpi.trend && (
                <span
                  className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md text-[11px] shrink-0 ${
                    kpi.trend.isNeutral
                      ? "text-stone-300 bg-stone-800 border border-stone-700"
                      : kpi.trend.isPositive
                      ? "text-emerald-300 bg-emerald-950/80 border border-emerald-800/60"
                      : "text-rose-300 bg-rose-950/80 border border-rose-800/60"
                  }`}
                >
                  {!kpi.trend.isNeutral && (
                    kpi.trend.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />
                  )}
                  {kpi.trend.label}
                </span>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
