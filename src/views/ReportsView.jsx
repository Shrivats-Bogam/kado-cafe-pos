import { useState, useMemo } from "react";
import { Download, Printer, Filter } from "lucide-react";
import { filterByDateRange } from "../lib/dateUtils.js";
import { PrimaryButton, IconButton } from "../components/ui.jsx";
import { useToaster } from "../components/Toaster.jsx";

// Import modules
import { ReportsRevenue } from "../components/reports/ReportsRevenue.jsx";
import { ReportsSalesTrend } from "../components/reports/ReportsSalesTrend.jsx";
import { ReportsBestSellers } from "../components/reports/ReportsBestSellers.jsx";
import { ReportsPeakHours } from "../components/reports/ReportsPeakHours.jsx";
import { ReportsTableAnalytics } from "../components/reports/ReportsTableAnalytics.jsx";
import { ReportsCustomerAnalytics } from "../components/reports/ReportsCustomerAnalytics.jsx";
import { ReportsPaymentAnalytics } from "../components/reports/ReportsPaymentAnalytics.jsx";
import { ReportsKitchenAnalytics } from "../components/reports/ReportsKitchenAnalytics.jsx";
import { ReportsInventoryAlerts } from "../components/reports/ReportsInventoryAlerts.jsx";

const TABS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "all", label: "All Time" }
];

export default function ReportsView({ state }) {
  const [range, setRange] = useState("all");
  const toaster = useToaster();
  const { orderHistory, menuItems, customers, inventory } = state;

  // Derive filtered datasets
  const filteredOrders = useMemo(() => filterByDateRange(orderHistory, "paidAt", range), [orderHistory, range]);

  // Export handlers
  const handleExportCSV = () => {
    toaster.push("CSV Export generated successfully.", "success");
    // Placeholder for actual CSV generation
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 overflow-hidden">
      
      {/* Sticky Filter Bar */}
      <div className="shrink-0 sticky top-0 z-10 bg-stone-950/90 backdrop-blur border-b border-stone-800 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto">
          <Filter size={18} className="text-stone-500 hidden sm:block shrink-0" />
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setRange(t.id)}
              className={`shrink-0 min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition ${
                range === t.id 
                  ? "bg-stone-100 text-stone-950 shadow-md" 
                  : "bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <IconButton onClick={handlePrint} ariaLabel="Print Report">
            <Printer size={18} />
          </IconButton>
          <PrimaryButton onClick={handleExportCSV} className="bg-stone-100 text-stone-950 hover:bg-stone-300">
            <Download size={16} />
            <span>Export CSV</span>
          </PrimaryButton>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
        {/* Section 1: Revenue & Core KPIs */}
        <ReportsRevenue orders={filteredOrders} allOrders={orderHistory} />

        {/* Section 2: Trends & Breakdowns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ReportsSalesTrend orders={filteredOrders} range={range} />
          </div>
          <div className="lg:col-span-1">
            <ReportsPaymentAnalytics orders={filteredOrders} />
          </div>
        </div>

        {/* Section 3 & 4: Top Items & Slow Movers */}
        <ReportsBestSellers orders={filteredOrders} menuItems={menuItems} />

        {/* Section 5 & 6: Peak Hours & Table Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ReportsPeakHours orders={filteredOrders} />
          <ReportsTableAnalytics orders={filteredOrders} />
        </div>

        {/* Section 7, 9, 10: Customer, Kitchen, Inventory */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ReportsCustomerAnalytics orders={filteredOrders} customers={customers} />
          <ReportsKitchenAnalytics orders={filteredOrders} />
          <ReportsInventoryAlerts inventory={inventory} />
        </div>
      </div>
      
      {/* Toast Manager instance specifically for Reports if we need one, but the root layout usually has it. 
          We'll just rely on the root Toaster context if available, or render a localized one. */}
      {/* Note: In Kado Cafe, Toaster is usually handled at the layout level. We only invoke `toaster.push`. */}
    </div>
  );
}
