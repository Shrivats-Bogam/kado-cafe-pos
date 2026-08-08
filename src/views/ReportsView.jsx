import { useState, useMemo } from "react";
import { Download, Printer, Filter, Calendar, BarChart3 } from "lucide-react";
import { filterByDateRange, getDateRangeWindow } from "../lib/dateUtils.js";
import { PrimaryButton, IconButton } from "../components/ui.jsx";
import { generateOwnerInsights } from "../lib/reportsAggregate.js";

// Import Reports Subcomponents
import { ReportsOwnerInsights } from "../components/reports/ReportsOwnerInsights.jsx";
import { ReportsRevenue } from "../components/reports/ReportsRevenue.jsx";
import { ReportsSalesTrend } from "../components/reports/ReportsSalesTrend.jsx";
import { ReportsBestSellers } from "../components/reports/ReportsBestSellers.jsx";
import { ReportsPeakHours } from "../components/reports/ReportsPeakHours.jsx";
import { ReportsTableAnalytics } from "../components/reports/ReportsTableAnalytics.jsx";
import { ReportsCustomerAnalytics } from "../components/reports/ReportsCustomerAnalytics.jsx";
import { ReportsPaymentAnalytics } from "../components/reports/ReportsPaymentAnalytics.jsx";
import { ReportsKitchenAnalytics } from "../components/reports/ReportsKitchenAnalytics.jsx";
import { ReportsInventoryAlerts } from "../components/reports/ReportsInventoryAlerts.jsx";

const PERIOD_TABS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week", label: "This Week" },
  { id: "last_week", label: "Last Week" },
  { id: "month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "custom", label: "Custom Range" },
  { id: "all", label: "All Time" }
];

export default function ReportsView({ state = {} }) {
  const [range, setRange] = useState("all");
  const [customStart, setCustomStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().slice(0, 10));

  const { orderHistory = [], menuItems = [], customers = [], inventory = [], recipes = {}, inventoryLogs = [], kitchenTickets = [] } = state;

  // Filter current period dataset
  const filteredOrders = useMemo(() => {
    return filterByDateRange(orderHistory, "paidAt", range, customStart, customEnd);
  }, [orderHistory, range, customStart, customEnd]);

  // Compute comparison period dataset (e.g., Yesterday for Today, Last Week for This Week)
  const rangeWindow = useMemo(() => {
    return getDateRangeWindow(range, customStart, customEnd);
  }, [range, customStart, customEnd]);

  const previousOrders = useMemo(() => {
    if (!rangeWindow || !rangeWindow.prevStart || !rangeWindow.prevEnd) return [];
    return orderHistory.filter((o) => {
      const val = o.paidAt || o.createdAt;
      if (!val) return false;
      const t = new Date(val).getTime();
      return t >= rangeWindow.prevStart.getTime() && t <= rangeWindow.prevEnd.getTime();
    });
  }, [orderHistory, rangeWindow]);

  // Rule-Based Owner Insights & Needs Attention
  const periodMetrics = useMemo(() => {
    return {
      current: { paidRevenue: filteredOrders.reduce((s, o) => s + (o.status === "Paid" ? o.grandTotal || 0 : 0), 0) },
      previous: { paidRevenue: previousOrders.reduce((s, o) => s + (o.status === "Paid" ? o.grandTotal || 0 : 0), 0) },
      rangeLabel: rangeWindow?.label || "Previous Period"
    };
  }, [filteredOrders, previousOrders, rangeWindow]);

  const { warnings, insights } = useMemo(() => {
    return generateOwnerInsights(state, periodMetrics);
  }, [state, periodMetrics]);

  // Export handlers
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return;

    const headers = ["Order ID", "Date", "Source", "Customer", "Phone", "Payment Mode", "Subtotal", "Discount", "GST", "Grand Total", "Status"];
    const rows = filteredOrders.map((o) => [
      o.id || "-",
      o.paidAt || o.createdAt || "-",
      o.source || "POS Order",
      o.customerName || "Walk-in",
      o.phone || "-",
      o.paymentMode || "Cash",
      o.subtotal || 0,
      o.discount || 0,
      o.gst || 0,
      o.grandTotal || 0,
      o.status || "Paid"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Kado_Cafe_Report_${range}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-100 overflow-hidden">
      {/* Sticky Filter Bar & Header (Hidden during window.print()) */}
      <div className="shrink-0 sticky top-0 z-20 bg-stone-950/95 backdrop-blur-md border-b border-stone-800 p-4 flex flex-col gap-3 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-serif font-bold text-stone-50 flex items-center gap-2">
              <BarChart3 className="text-amber-500" size={22} /> Reports & Owner Decision Center 3.0
            </h2>
            <p className="text-xs text-stone-400">Read-only business intelligence, sales trends, operational insights & financial analytics</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <IconButton onClick={handlePrint} ariaLabel="Print Report">
              <Printer size={18} />
            </IconButton>

            <PrimaryButton 
              onClick={handleExportCSV} 
              disabled={filteredOrders.length === 0}
              className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs min-h-[44px] px-4 cursor-pointer"
            >
              <Download size={16} />
              <span>Export CSV</span>
            </PrimaryButton>
          </div>
        </div>

        {/* Global Date Period Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-stone-800/80">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <Filter size={16} className="text-stone-500 hidden sm:block shrink-0 mr-1" />
            {PERIOD_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setRange(t.id)}
                className={`shrink-0 min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  range === t.id
                    ? "bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20"
                    : "bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-100 hover:bg-stone-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Picker */}
          {range === "custom" && (
            <div className="flex items-center gap-2 text-xs bg-stone-900 p-1.5 rounded-xl border border-stone-800 shrink-0">
              <Calendar size={14} className="text-amber-500 ml-1" />
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-stone-950 border border-stone-800 rounded-lg px-2 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              />
              <span className="text-stone-500 font-bold">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-stone-950 border border-stone-800 rounded-lg px-2 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Printable Content Container */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 no-scrollbar print:p-0 print:overflow-visible">
        
        {/* Printable Header Banner */}
        <div className="hidden print:block mb-4 border-b border-stone-800 pb-2">
          <h1 className="text-2xl font-bold text-stone-900">Kado Cafe POS — Business Intelligence Report</h1>
          <p className="text-xs text-stone-600">Period: {range.toUpperCase()} | Generated on {new Date().toLocaleString()}</p>
        </div>

        {/* Section 1: Actionable Needs Attention & Owner Insights */}
        <ReportsOwnerInsights warnings={warnings} insights={insights} />

        {/* Section 2: Executive Summary & Core Financial KPIs */}
        <ReportsRevenue 
          orders={filteredOrders} 
          previousOrders={previousOrders} 
          comparisonLabel={rangeWindow?.label}
        />

        {/* Section 3: Revenue Trend & Payment Methods */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ReportsSalesTrend orders={filteredOrders} range={range} />
          </div>
          <div className="lg:col-span-1">
            <ReportsPaymentAnalytics orders={filteredOrders} />
          </div>
        </div>

        {/* Section 4: Best Sellers & Slow Movers */}
        <ReportsBestSellers orders={filteredOrders} menuItems={menuItems} />

        {/* Section 5: Peak Hours & Dine-in vs Parcel Channel Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ReportsPeakHours orders={filteredOrders} />
          <ReportsTableAnalytics orders={filteredOrders} />
        </div>

        {/* Section 6: CRM Loyalty, Kitchen & Inventory Shortage Intelligence */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ReportsCustomerAnalytics orders={filteredOrders} customers={customers} />
          <ReportsKitchenAnalytics orders={filteredOrders} kitchenTickets={kitchenTickets} />
          <ReportsInventoryAlerts 
            inventory={inventory} 
            recipes={recipes} 
            inventoryLogs={inventoryLogs} 
            menuItems={menuItems} 
          />
        </div>
      </div>
    </div>
  );
}
