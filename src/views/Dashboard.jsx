import { useMemo } from "react";
import {
  BarChart3, ShoppingCart, Coffee, AlertTriangle, ChefHat, LayoutDashboard,
  Package, Users, Menu as MenuIcon, ArrowRight, ShieldAlert, CheckCircle2,
  Clock, Sparkles, TrendingUp, Utensils, Gift, Zap
} from "lucide-react";
import { Card, PrimaryButton } from "../components/ui.jsx";
import { currency } from "../lib/currency.js";
import { filterByDateRange } from "../lib/dateUtils.js";
import {
  computeRevenueMetrics,
  computeGrowth,
  aggregateProductPerformance,
  aggregateHourlyPerformance,
  aggregateChannelPerformance,
  aggregateInventoryIntelligence,
  generateOwnerInsights
} from "../lib/reportsAggregate.js";

const QUICK_LAUNCHER = [
  { id: "tables", label: "Tables", icon: Coffee, desc: "Floor plan & table orders", color: "text-amber-500" },
  { id: "kitchen", label: "Kitchen", icon: ChefHat, desc: "KDS order queue", color: "text-orange-500" },
  { id: "parcel", label: "Parcel", icon: Package, desc: "Takeaway management", color: "text-sky-500" },
  { id: "menu", label: "Menu", icon: MenuIcon, desc: "Categories & availability", color: "text-emerald-500" },
  { id: "customers", label: "Customers", icon: Users, desc: "CRM profiles & loyalty", color: "text-purple-500" },
  { id: "inventory", label: "Inventory", icon: Package, desc: "Stock & recipe management", color: "text-amber-400" },
  { id: "reports", label: "Reports", icon: BarChart3, desc: "Business intelligence & export", color: "text-emerald-400" },
  { id: "insights", label: "Insights", icon: Sparkles, desc: "Operational recommendations", color: "text-pink-400" }
];

export default function Dashboard({ state = {}, onNavigate, currentUser }) {
  const {
    orderHistory = [],
    menuItems = [],
    customers = [],
    inventory = [],
    recipes = {},
    inventoryLogs = [],
    tables = [],
    parcels = [],
    kitchenTickets = []
  } = state;

  // 1. Time & Greeting Header Calculation
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }, []);

  // 2. Consume Reports 3.0 Central Aggregations for Today & Yesterday
  const todayOrders = useMemo(() => filterByDateRange(orderHistory, "paidAt", "today"), [orderHistory]);
  const yesterdayOrders = useMemo(() => filterByDateRange(orderHistory, "paidAt", "yesterday"), [orderHistory]);

  const todayRev = useMemo(() => computeRevenueMetrics(todayOrders), [todayOrders]);
  const yesterdayRev = useMemo(() => computeRevenueMetrics(yesterdayOrders), [yesterdayOrders]);

  const revenueGrowth = useMemo(() => computeGrowth(todayRev.paidRevenue, yesterdayRev.paidRevenue), [todayRev, yesterdayRev]);
  const ordersGrowth = useMemo(() => computeGrowth(todayRev.paidCount, yesterdayRev.paidCount), [todayRev, yesterdayRev]);

  // 3. Operational Real-Time States
  const availableTables = useMemo(() => tables.filter((t) => t.status === "available").length, [tables]);
  const occupiedTables = useMemo(() => tables.filter((t) => t.status === "occupied" || t.status === "ordered" || t.status === "served").length, [tables]);
  const pendingBillsCount = useMemo(() => tables.filter((t) => t.status === "payment_pending").length + todayRev.pendingCount, [tables, todayRev]);

  const kitchenWaiting = useMemo(() => kitchenTickets.filter((t) => t.status === "waiting" || t.status === "queued").length, [kitchenTickets]);
  const kitchenCooking = useMemo(() => kitchenTickets.filter((t) => t.status === "cooking" || t.status === "preparing").length, [kitchenTickets]);
  const kitchenReady = useMemo(() => kitchenTickets.filter((t) => t.status === "ready").length, [kitchenTickets]);
  const rushTicketsCount = useMemo(() => kitchenTickets.filter((t) => t.isRush || (t.items && t.items.some((i) => i.isRush))).length, [kitchenTickets]);

  // 4. Inventory Intelligence
  const inventoryIntel = useMemo(() => {
    return aggregateInventoryIntelligence(inventory, recipes, inventoryLogs, menuItems);
  }, [inventory, recipes, inventoryLogs, menuItems]);

  // 5. Product & Channel Performance
  const { bestSellers } = useMemo(() => aggregateProductPerformance(todayOrders, menuItems), [todayOrders, menuItems]);
  const { peakHour } = useMemo(() => aggregateHourlyPerformance(todayOrders), [todayOrders]);
  const { tableRevenue, parcelRevenue } = useMemo(() => aggregateChannelPerformance(todayOrders), [todayOrders]);

  // 6. Reports 3.0 Owner Insights & Warnings
  const periodMetrics = useMemo(() => ({
    current: todayRev,
    previous: yesterdayRev,
    rangeLabel: "Yesterday"
  }), [todayRev, yesterdayRev]);

  const { warnings, insights } = useMemo(() => {
    return generateOwnerInsights(state, periodMetrics);
  }, [state, periodMetrics]);

  // 7. Prioritized "WHAT SHOULD I DO NEXT?" System (PART 16, 17)
  const prioritizedActions = useMemo(() => {
    const actionsList = [];

    // Priority 1: Pending payments
    if (todayRev.pendingCount > 0) {
      actionsList.push({
        priority: "Critical 🔴",
        task: `Review ${todayRev.pendingCount} pending bill(s) (₹${todayRev.pendingRevenue.toLocaleString()})`,
        target: "tables",
        btnLabel: "Review Billing"
      });
    }

    // Priority 2: Rush kitchen orders
    if (rushTicketsCount > 0) {
      actionsList.push({
        priority: "High 🟠",
        task: `Expedite ${rushTicketsCount} rush kitchen ticket(s)`,
        target: "kitchen",
        btnLabel: "Open Kitchen"
      });
    }

    // Priority 3: Out of stock ingredients
    if (inventoryIntel.outOfStockCount > 0) {
      actionsList.push({
        priority: "High 🟠",
        task: `Restock ${inventoryIntel.outOfStockCount} out-of-stock ingredient(s)`,
        target: "inventory",
        btnLabel: "View Inventory"
      });
    }

    // Priority 4: Affected Menu Items
    if (inventoryIntel.affectedMenuItems.length > 0) {
      actionsList.push({
        priority: "Normal 🟡",
        task: `Review ${inventoryIntel.affectedMenuItems.length} menu item(s) affected by stock shortages`,
        target: "menu",
        btnLabel: "View Menu"
      });
    }

    // Priority 5: Low Stock Warning
    if (inventoryIntel.lowStockCount > 0) {
      actionsList.push({
        priority: "Normal 🟡",
        task: `Review reorder alerts for ${inventoryIntel.lowStockCount} low-stock ingredient(s)`,
        target: "inventory",
        btnLabel: "Check Stock"
      });
    }

    // Default fallback action
    if (actionsList.length === 0) {
      actionsList.push({
        priority: "Optimization 🟢",
        task: "All operations running smoothly. Review sales performance in Reports.",
        target: "reports",
        btnLabel: "View Reports"
      });
    }

    return actionsList;
  }, [todayRev, rushTicketsCount, inventoryIntel]);

  // Recent 5 Order Events
  const recentOrders = useMemo(() => {
    return [...orderHistory]
      .sort((a, b) => new Date(b.paidAt || b.createdAt || 0) - new Date(a.paidAt || a.createdAt || 0))
      .slice(0, 5);
  }, [orderHistory]);

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900 p-4 rounded-2xl border border-stone-800 shadow-md">
        <div>
          <h2 className="text-xl font-serif font-bold text-stone-50 flex items-center gap-2">
            {greeting}, <span className="text-amber-400">{currentUser?.name || "Owner"}</span>
          </h2>
          <p className="text-xs text-stone-400 flex items-center gap-2 mt-0.5 font-mono">
            <span>{formattedDate}</span>
            <span className="text-stone-600">•</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live & Operational
            </span>
          </p>
        </div>

        {onNavigate && (
          <PrimaryButton
            onClick={() => onNavigate("tables")}
            className="min-h-[44px] px-4 text-xs font-bold shrink-0 shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
          >
            <Coffee size={16} /> Open Floor Tables
          </PrimaryButton>
        )}
      </div>

      {/* 2. Executive KPI Row (PART 4, 5) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3.5 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Today's Revenue</span>
            <BarChart3 size={16} className="text-emerald-500" />
          </div>
          <span className="text-xl font-bold text-emerald-400 font-serif">{currency(todayRev.paidRevenue)}</span>
          <span className="text-[10px] text-stone-500 font-medium truncate">
            {revenueGrowth.pct !== null ? revenueGrowth.label : "Yesterday: ₹0"}
          </span>
        </Card>

        <Card className="p-3.5 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Paid Orders</span>
            <ShoppingCart size={16} className="text-amber-500" />
          </div>
          <span className="text-xl font-bold text-stone-50 font-serif">{todayRev.paidCount}</span>
          <span className="text-[10px] text-stone-500 font-medium truncate">
            {ordersGrowth.pct !== null ? ordersGrowth.label : `${todayOrders.length} total orders`}
          </span>
        </Card>

        <Card className="p-3.5 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Avg Order Value</span>
            <Coffee size={16} />
          </div>
          <span className="text-xl font-bold text-amber-400 font-serif">{currency(todayRev.aov)}</span>
          <span className="text-[10px] text-stone-500 font-medium">Per paid bill</span>
        </Card>

        <Card className="p-3.5 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between text-purple-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Customers Today</span>
            <Users size={16} />
          </div>
          <span className="text-xl font-bold text-purple-300 font-serif">{todayRev.paidCount}</span>
          <span className="text-[10px] text-stone-500 font-medium">Served today</span>
        </Card>

        <Card className="p-3.5 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between text-sky-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Pending Bills</span>
            <Clock size={16} />
          </div>
          <span className="text-xl font-bold text-sky-300 font-serif">{currency(todayRev.pendingRevenue)}</span>
          <span className="text-[10px] text-stone-500 font-medium">{todayRev.pendingCount} bill(s) pending</span>
        </Card>

        <Card className="p-3.5 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Kitchen Queue</span>
            <ChefHat size={16} />
          </div>
          <span className="text-xl font-bold text-rose-400 font-serif">{kitchenWaiting + kitchenCooking}</span>
          <span className="text-[10px] text-stone-500 font-medium">{rushTicketsCount} rush tickets</span>
        </Card>
      </div>

      {/* 3. Prioritized "WHAT SHOULD I DO NEXT?" System & Needs Attention (PART 7, 16, 17) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Prioritized Action List */}
        <Card className="lg:col-span-7 p-4 bg-stone-900 border-stone-800 flex flex-col gap-3 shadow-md">
          <div className="flex justify-between items-center border-b border-stone-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Zap size={16} /> What Should I Do Next? (Prioritized Tasks)
            </h3>
            <span className="text-[10px] text-stone-500 font-mono">Owner Decision System</span>
          </div>

          <div className="space-y-2">
            {prioritizedActions.map((act, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-bold font-mono text-stone-500 shrink-0">#{idx + 1}</span>
                  <span className="font-semibold text-stone-200 truncate">{act.task}</span>
                </div>

                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate(act.target)}
                    className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1 transition shrink-0 cursor-pointer min-h-[38px]"
                  >
                    {act.btnLabel} <ArrowRight size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Needs Attention Actionable Warnings */}
        <Card className="lg:col-span-5 p-4 bg-stone-900 border-stone-800 flex flex-col gap-3 shadow-md">
          <div className="flex justify-between items-center border-b border-stone-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <ShieldAlert size={16} /> Needs Attention ({warnings.length})
            </h3>
            <span className="text-[10px] text-stone-500 font-mono">Real-Time Alerts</span>
          </div>

          {warnings.length === 0 ? (
            <div className="py-6 text-center text-xs text-emerald-400 flex flex-col items-center gap-1.5 border border-dashed border-emerald-500/30 rounded-xl bg-emerald-500/5">
              <CheckCircle2 size={20} />
              <span className="font-semibold">✓ Everything looks good! No urgent alerts.</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {warnings.map((w, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs flex flex-col gap-0.5">
                  <span className="font-bold text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle size={13} className="shrink-0" /> {w.title}
                  </span>
                  <span className="text-[11px] text-stone-400">{w.detail}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 4. Real-Time Operations Grid (PART 6, 11, 12, 13, 14) */}
      <Card className="p-4 bg-stone-900 border-stone-800 flex flex-col gap-3 shadow-md">
        <div className="flex justify-between items-center border-b border-stone-800 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-2">
            <LayoutDashboard size={16} className="text-amber-500" /> Live Operations Command Status
          </h3>
          <span className="text-[10px] text-stone-500 font-mono">Real-Time State</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Tables Status */}
          <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 flex flex-col justify-between gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-stone-300 flex items-center gap-1">
                <Coffee size={14} className="text-amber-500" /> Floor Tables
              </span>
              {onNavigate && (
                <button type="button" onClick={() => onNavigate("tables")} className="text-[10px] text-amber-400 font-bold hover:underline cursor-pointer">
                  Open
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-[10px] text-stone-500 block">Available</span>
                <span className="font-bold text-emerald-400">{availableTables}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block">Occupied</span>
                <span className="font-bold text-amber-400">{occupiedTables}</span>
              </div>
            </div>
          </div>

          {/* Kitchen Status */}
          <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 flex flex-col justify-between gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-stone-300 flex items-center gap-1">
                <ChefHat size={14} className="text-orange-500" /> Kitchen KDS
              </span>
              {onNavigate && (
                <button type="button" onClick={() => onNavigate("kitchen")} className="text-[10px] text-amber-400 font-bold hover:underline cursor-pointer">
                  Open
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1 text-xs font-mono text-center">
              <div>
                <span className="text-[10px] text-stone-500 block">Wait</span>
                <span className="font-bold text-amber-400">{kitchenWaiting}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block">Cook</span>
                <span className="font-bold text-sky-400">{kitchenCooking}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block">Ready</span>
                <span className="font-bold text-emerald-400">{kitchenReady}</span>
              </div>
            </div>
          </div>

          {/* Inventory Status */}
          <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 flex flex-col justify-between gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-stone-300 flex items-center gap-1">
                <Package size={14} className="text-amber-400" /> Stock Master
              </span>
              {onNavigate && (
                <button type="button" onClick={() => onNavigate("inventory")} className="text-[10px] text-amber-400 font-bold hover:underline cursor-pointer">
                  View
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-[10px] text-stone-500 block">Low Stock</span>
                <span className="font-bold text-amber-400">{inventoryIntel.lowStockCount}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block">Out of Stock</span>
                <span className="font-bold text-rose-400">{inventoryIntel.outOfStockCount}</span>
              </div>
            </div>
          </div>

          {/* Customer CRM Snapshot */}
          <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 flex flex-col justify-between gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-stone-300 flex items-center gap-1">
                <Users size={14} className="text-purple-400" /> Customer CRM
              </span>
              {onNavigate && (
                <button type="button" onClick={() => onNavigate("customers")} className="text-[10px] text-amber-400 font-bold hover:underline cursor-pointer">
                  View
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-[10px] text-stone-500 block">Total CRM</span>
                <span className="font-bold text-stone-200">{customers.length}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block">Points Pool</span>
                <span className="font-bold text-purple-400">
                  {customers.reduce((sum, c) => sum + (c.points || 0), 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 5. Quick Launcher & Today's Insights (PART 8, 9, 15) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 8-Module App Launcher */}
        <Card className="lg:col-span-8 p-4 bg-stone-900 border-stone-800 flex flex-col gap-3 shadow-md">
          <div className="flex justify-between items-center border-b border-stone-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-2">
              <LayoutDashboard size={16} className="text-amber-500" /> Quick App Launcher
            </h3>
            <span className="text-[10px] text-stone-500 font-mono">Fast Navigation</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {QUICK_LAUNCHER.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onNavigate && onNavigate(m.id)}
                className="p-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-left transition flex flex-col justify-between gap-2 min-h-[70px] active:scale-95 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <m.icon size={20} className={m.color} />
                  <ArrowRight size={14} className="text-stone-600 group-hover:text-stone-300 transition" />
                </div>
                <div>
                  <span className="font-bold text-stone-100 text-xs block">{m.label}</span>
                  <span className="text-[10px] text-stone-500 block truncate">{m.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Today's Sales Snapshot & Insights */}
        <Card className="lg:col-span-4 p-4 bg-stone-900 border-stone-800 flex flex-col gap-3 shadow-md">
          <div className="flex justify-between items-center border-b border-stone-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Sparkles size={16} /> Sales Snapshot & Insights
            </h3>
            {onNavigate && (
              <button type="button" onClick={() => onNavigate("reports")} className="text-[10px] text-amber-400 font-bold hover:underline cursor-pointer">
                Full Reports
              </button>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center bg-stone-950 p-2 rounded-xl border border-stone-800">
              <span className="text-stone-400 font-medium">Top Seller Today</span>
              <span className="font-bold text-amber-400 font-serif">{bestSellers[0]?.name || "—"}</span>
            </div>

            <div className="flex justify-between items-center bg-stone-950 p-2 rounded-xl border border-stone-800">
              <span className="text-stone-400 font-medium">Peak Hour Today</span>
              <span className="font-bold text-stone-200 font-mono">{peakHour?.label || "—"}</span>
            </div>

            <div className="flex justify-between items-center bg-stone-950 p-2 rounded-xl border border-stone-800">
              <span className="text-stone-400 font-medium">Dine-in vs Parcel</span>
              <span className="font-bold text-stone-200 font-mono">₹{tableRevenue.toLocaleString()} / ₹{parcelRevenue.toLocaleString()}</span>
            </div>
          </div>

          {insights.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-xs text-amber-300 flex items-start gap-2">
              <TrendingUp size={15} className="shrink-0 mt-0.5" />
              <span>{insights[0]}</span>
            </div>
          )}
        </Card>
      </div>

      {/* 6. Recent Activity Feed (PART 10) */}
      <Card className="p-4 bg-stone-900 border-stone-800 flex flex-col gap-3 shadow-md">
        <div className="flex justify-between items-center border-b border-stone-800 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300">Recent Activity Feed</h3>
          <span className="text-[10px] text-stone-500 font-mono">Last 5 Transactions</span>
        </div>

        {recentOrders.length === 0 ? (
          <p className="text-xs text-stone-500 py-4 text-center">No transactions recorded today.</p>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((o) => (
              <div key={o.id} className="flex justify-between items-center text-xs bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-amber-400">{o.id}</span>
                  <span className="text-stone-300 font-medium">{o.source || "POS Order"}{o.customerName ? ` · ${o.customerName}` : ""}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-stone-100 block">{currency(o.grandTotal)}</span>
                  <span className="text-[10px] text-stone-500 font-mono">
                    {new Date(o.paidAt || o.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
