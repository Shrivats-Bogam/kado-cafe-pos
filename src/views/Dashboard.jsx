import { useMemo, useState } from "react";
import {
  BarChart3, ShoppingCart, Package, Coffee, AlertTriangle, ChefHat,
  TrendingUp, TrendingDown, Download, FileText, FileSpreadsheet
} from "lucide-react";
import { Card, StatCard, PrimaryButton } from "../components/ui.jsx";
import { currency, isToday, isThisMonth } from "../lib/currency.js";
import { topSellers } from "../lib/aggregate.js";

export default function Dashboard({ state }) {
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState("json");

  const todayOrders = state.orderHistory.filter((o) => isToday(o.paidAt));
  const revenueToday = todayOrders.reduce((s, o) => s + (o.grandTotal || 0), 0);
  const parcelToday = state.parcels.filter((p) => isToday(p.createdAt)).length;
  const available = state.tables.filter((t) => t.status === "available").length;
  const occupied = state.tables.length - available;
  const pending = state.tables.filter((t) => t.status === "payment_pending").length;
  const monthRevenue = state.orderHistory
    .filter((o) => isThisMonth(o.paidAt))
    .reduce((s, o) => s + (o.grandTotal || 0), 0);

  // Calculate yesterday's revenue for trend comparison
  const isYesterday = (dateString) => {
    if (!dateString) return false;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const today = new Date();
    
    const date = new Date(dateString);
    return date.getDate() === yesterday.getDate() &&
           date.getMonth() === yesterday.getMonth() &&
           date.getFullYear() === yesterday.getFullYear() &&
           date.getFullYear() === today.getFullYear();
  };

  const yesterdayOrders = state.orderHistory.filter((o) => isYesterday(o.paidAt));
  const revenueYesterday = yesterdayOrders.reduce((s, o) => s + (o.grandTotal || 0), 0);
  const revenueTrend = revenueYesterday > 0 
    ? ((revenueToday - revenueYesterday) / revenueYesterday) * 100 
    : revenueToday > 0 ? 100 : 0;

  // Calculate last month's revenue for trend comparison
  const isLastMonth = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    return date >= lastMonth && date <= endOfLastMonth;
  };

  const lastMonthOrders = state.orderHistory.filter((o) => isLastMonth(o.paidAt));
  const revenueLastMonth = lastMonthOrders.reduce((s, o) => s + (o.grandTotal || 0), 0);
  const monthRevenueTrend = revenueLastMonth > 0
    ? ((monthRevenue - revenueLastMonth) / revenueLastMonth) * 100
    : monthRevenue > 0 ? 100 : 0;

  const bestSeller = useMemo(
    () => topSellers(state.orderHistory, state.menuItems, 1)[0]?.name || "—",
    [state.orderHistory, state.menuItems]
  );

  const recent = [...state.orderHistory]
    .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt))
    .slice(0, 5);

  // Export functions
  const generateCSV = (data, headers) => {
    const rows = [headers.join(","), ...data.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )];
    return rows.join("\n");
  };

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `dashboard-${dateStr}`;

      if (exportFormat === "csv") {
        // CSV Export - Dashboard Summary
        const summaryHeaders = ["Metric", "Value"];
        const summaryData = [
          ["Date", new Date().toLocaleDateString()],
          ["Today's Revenue", currency(revenueToday)],
          ["Today's Orders", todayOrders.length.toString()],
          ["Avg Order Value", currency(todayOrders.length ? revenueToday / todayOrders.length : 0)],
          ["Parcel Orders", parcelToday.toString()],
          ["Available Tables", available.toString()],
          ["Occupied Tables", occupied.toString()],
          ["Pending Bills", pending.toString()],
          ["Best Selling Item", bestSeller],
          ["Monthly Revenue", currency(monthRevenue)],
        ];
        const csv = generateCSV(summaryData, summaryHeaders);
        downloadFile(csv, `${filename}.csv`, "text/csv");

        // Also export recent orders as separate CSV
        if (recent.length > 0) {
          const ordersHeaders = ["Order ID", "Time", "Source", "Customer", "Total", "Payment"];
          const ordersData = recent.map(o => [
            o.id,
            new Date(o.paidAt).toLocaleString(),
            o.source,
            o.customerName || "",
            currency(o.grandTotal),
            o.paymentMode || "Cash"
          ]);
          const ordersCsv = generateCSV(ordersData, ordersHeaders);
          setTimeout(() => downloadFile(ordersCsv, `${filename}-orders.csv`, "text/csv"), 100);
        }
      } else {
        // JSON Export
        const data = {
          generatedAt: new Date().toISOString(),
          summary: {
            revenueToday: currency(revenueToday),
            ordersToday: todayOrders.length,
            avgOrderValue: currency(todayOrders.length ? revenueToday / todayOrders.length : 0),
            parcelsToday: parcelToday,
            availableTables: available,
            occupiedTables: occupied,
            pendingBills: pending,
            bestSeller,
            monthlyRevenue: currency(monthRevenue),
            revenueTrend: `${revenueTrend >= 0 ? "+" : ""}${revenueTrend.toFixed(1)}%`,
            monthlyRevenueTrend: `${monthRevenueTrend >= 0 ? "+" : ""}${monthRevenueTrend.toFixed(1)}%`,
          },
          recentOrders: recent.map(o => ({
            id: o.id,
            timestamp: o.paidAt,
            source: o.source,
            customer: o.customerName,
            total: currency(o.grandTotal),
            payment: o.paymentMode || "Cash",
            items: o.items?.map(i => ({ name: i.menuItemId, qty: i.qty })) || []
          }))
        };
        const json = JSON.stringify(data, null, 2);
        downloadFile(json, `${filename}.json`, "application/json");
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header with Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="font-serif text-lg text-stone-50">Dashboard</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            disabled={exporting}
            className="rounded-xl bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </select>
          <PrimaryButton 
            onClick={handleExport} 
            disabled={exporting}
            icon={Download}
            size="sm"
            className="whitespace-nowrap"
          >
            {exporting ? "Exporting..." : "Export"}
          </PrimaryButton>
        </div>
      </div>

      {/* Responsive Stat Cards Grid: 1 col < 480px, 2 cols 480-768px, 3 cols 768-1024px, 4 cols > 1024px */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard 
          label="Today's Revenue" 
          value={currency(revenueToday)} 
          icon={BarChart3} 
          trend={revenueTrend >= 0 ? `+${revenueTrend.toFixed(1)}%` : `${revenueTrend.toFixed(1)}%`}
          trendIcon={revenueTrend >= 0 ? TrendingUp : TrendingDown}
        />
        <StatCard label="Today's Orders" value={todayOrders.length} icon={ShoppingCart} />
        <StatCard label="Parcel Orders" value={parcelToday} icon={Package} accent="text-emerald-500" />
        <StatCard label="Available Tables" value={available} icon={Coffee} accent="text-emerald-500" />
        <StatCard label="Occupied Tables" value={occupied} icon={Coffee} accent="text-amber-500" />
        <StatCard label="Pending Bills" value={pending} icon={AlertTriangle} accent="text-rose-500" />
        <StatCard label="Best Selling Item" value={bestSeller} icon={ChefHat} />
        <StatCard 
          label="Monthly Revenue" 
          value={currency(monthRevenue)} 
          icon={BarChart3} 
          trend={monthRevenueTrend >= 0 ? `+${monthRevenueTrend.toFixed(1)}%` : `${monthRevenueTrend.toFixed(1)}%`}
          trendIcon={monthRevenueTrend >= 0 ? TrendingUp : TrendingDown}
        />
      </div>

      <Card className="p-4 sm:p-5">
        <h3 className="text-sm sm:text-base font-medium text-stone-300 mb-3">Recent Activity</h3>
        {recent.length === 0 && <p className="text-sm text-stone-500">No orders yet today.</p>}
        <div className="flex flex-col gap-2">
          {recent.map((o) => (
            <div
              key={o.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-stone-400 border-b border-stone-800 last:border-0 pb-2 last:pb-0"
            >
              <span className="truncate sm:truncate-none">{o.source}{o.customerName ? ` · ${o.customerName}` : ""}</span>
              <span className="text-stone-200 font-medium whitespace-nowrap">{currency(o.grandTotal)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}