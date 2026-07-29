import { useMemo, useState } from "react";
import { 
  BarChart3, ShoppingCart, Coffee, AlertTriangle, 
  TrendingUp, TrendingDown, Users, Package, 
  Clock, CreditCard, RefreshCw, RefreshCcw, Download,
  FileText, FileSpreadsheet, Calendar, ChevronDown
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from "recharts";
import { Card, StatCard, PrimaryButton } from "../components/ui.jsx";
import { currency, isToday, isYesterday, isThisWeek, isLastWeek } from "../lib/currency.js";
import { topSellers, totalRevenue, revenueByDay } from "../lib/aggregate.js";

export default function ReportsView({ orderHistory, menuItems }) {
  // Time period selection
  const [timeRange, setTimeRange] = useState("today");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState("json");
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [customRange, setCustomRange] = useState({ start: "", end: "" });

  // Get data for selected time range
  const getOrdersForRange = () => {
    switch (timeRange) {
      case "yesterday": return orderHistory.filter(o => isYesterday(o.paidAt));
      case "week": return orderHistory.filter(o => isThisWeek(o.paidAt));
      case "lastweek": return orderHistory.filter(o => isLastWeek(o.paidAt));
      case "month": return orderHistory.filter(o => {
        const date = new Date(o.paidAt);
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      });
      case "custom": {
        if (!customRange.start || !customRange.end) return [];
        const start = new Date(customRange.start);
        const end = new Date(customRange.end);
        end.setHours(23, 59, 59, 999);
        return orderHistory.filter(o => {
          const date = new Date(o.paidAt);
          return date >= start && date <= end;
        });
      }
      default: return orderHistory.filter(o => isToday(o.paidAt));
    }
  };

  const rangeOrders = useMemo(() => getOrdersForRange(), [orderHistory, timeRange, customRange]);
  const allOrders = useMemo(() => orderHistory.filter(o => isToday(o.paidAt)), [orderHistory]);
  
  const rangeRevenue = rangeOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const rangeAvgOrder = rangeOrders.length ? rangeRevenue / rangeOrders.length : 0;
  const rangeParcels = rangeOrders.filter(o => o.source === "Parcel").length;
  const rangeCustomers = new Set(rangeOrders.map(o => o.customerName).filter(Boolean)).size;
  
  // Previous period for comparison
  const getPreviousRangeOrders = () => {
    switch (timeRange) {
      case "today": return orderHistory.filter(o => isYesterday(o.paidAt));
      case "yesterday": {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        return orderHistory.filter(o => o.paidAt?.startsWith(yesterdayStr));
      }
      case "week": return orderHistory.filter(o => isLastWeek(o.paidAt));
      case "lastweek": {
        const lastWeekStart = new Date();
        lastWeekStart.setDate(lastWeekStart.getDate() - 14);
        lastWeekStart.setDate(lastWeekStart.getDate() - lastWeekStart.getDay());
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
        return orderHistory.filter(o => {
          const date = new Date(o.paidAt);
          return date >= lastWeekStart && date <= lastWeekEnd;
        });
      }
      case "month": {
        const prevMonth = new Date();
        prevMonth.setMonth(prevMonth.getMonth() - 1);
        return orderHistory.filter(o => {
          const date = new Date(o.paidAt);
          return date.getMonth() === prevMonth.getMonth() && date.getFullYear() === prevMonth.getFullYear();
        });
      }
      case "custom": return [];
      default: return orderHistory.filter(o => isYesterday(o.paidAt));
    }
  };
  
  const prevOrders = useMemo(() => getPreviousRangeOrders(), [orderHistory, timeRange]);
  const prevRevenue = prevOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const revenueChange = prevRevenue ? ((rangeRevenue - prevRevenue) / prevRevenue * 100) : 0;
  
  const bestSellers = useMemo(
    () => topSellers(rangeOrders, menuItems, 6),
    [rangeOrders, menuItems]
  );

  const paymentBreakdown = useMemo(() => {
    const counts = {};
    rangeOrders.forEach((o) => {
      const mode = o.paymentMode || "Cash";
      counts[mode] = (counts[mode] || 0) + (o.grandTotal || 0);
    });
    return counts;
  }, [rangeOrders]);

  const categoryBreakdown = useMemo(() => {
    const counts = {};
    rangeOrders.forEach((o) => {
      (o.items || []).forEach((it) => {
        const mi = menuItems.find(m => m.id === it.menuItemId);
        const cat = mi?.category || "Other";
        counts[cat] = (counts[cat] || 0) + (it.qty * (mi?.price || 0));
      });
    });
    return counts;
  }, [rangeOrders, menuItems]);

  const hourlyBreakdown = useMemo(() => {
    const hours = {};
    rangeOrders.forEach((o) => {
      const hour = new Date(o.paidAt).getHours();
      const key = `${hour.toString().padStart(2, '0')}:00`;
      hours[key] = (hours[key] || 0) + (o.grandTotal || 0);
    });
    return hours;
  }, [rangeOrders]);

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

  const handleExport = async (format = exportFormat) => {
    setExporting(true);
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const rangeLabel = timeRange === "custom" 
        ? `${customRange.start}_${customRange.end}` 
        : timeRange;
      const filename = `report-${rangeLabel}-${dateStr}`;

      if (format === "csv") {
        // Summary CSV
        const summaryHeaders = ["Metric", "Value"];
        const summaryData = [
          ["Report Generated", new Date().toLocaleString()],
          ["Period", timeRange === "custom" ? `${customRange.start} to ${customRange.end}` : timeRange],
          ["Total Revenue", currency(rangeRevenue)],
          ["Total Orders", rangeOrders.length.toString()],
          ["Avg Order Value", currency(rangeAvgOrder)],
          ["Parcel Orders", rangeParcels.toString()],
          ["Unique Customers", rangeCustomers.toString()],
          ["Revenue vs Prev Period", `${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(1)}%`],
        ];
        downloadFile(generateCSV(summaryData, summaryHeaders), `${filename}-summary.csv`, "text/csv");

        // Best Sellers CSV
        if (bestSellers.length > 0) {
          const sellersHeaders = ["Rank", "Item", "Quantity Sold"];
          const sellersData = bestSellers.map((s, i) => [String(i + 1), s.name, String(s.qty)]);
          setTimeout(() => downloadFile(generateCSV(sellersData, sellersHeaders), `${filename}-bestsellers.csv`, "text/csv"), 100);
        }

        // Payment Breakdown CSV
        if (Object.keys(paymentBreakdown).length > 0) {
          const payHeaders = ["Payment Method", "Amount"];
          const payData = Object.entries(paymentBreakdown).map(([mode, amt]) => [mode, currency(amt)]);
          setTimeout(() => downloadFile(generateCSV(payData, payHeaders), `${filename}-payments.csv`, "text/csv"), 200);
        }

        // Category Breakdown CSV
        if (Object.keys(categoryBreakdown).length > 0) {
          const catHeaders = ["Category", "Revenue"];
          const catData = Object.entries(categoryBreakdown).map(([cat, amt]) => [cat, currency(amt)]);
          setTimeout(() => downloadFile(generateCSV(catData, catHeaders), `${filename}-categories.csv`, "text/csv"), 300);
        }

        // Hourly Breakdown CSV
        if (Object.keys(hourlyBreakdown).length > 0) {
          const hourHeaders = ["Hour", "Revenue"];
          const hourData = Object.entries(hourlyBreakdown).map(([hr, amt]) => [hr, currency(amt)]);
          setTimeout(() => downloadFile(generateCSV(hourData, hourHeaders), `${filename}-hourly.csv`, "text/csv"), 400);
        }

        // Orders Detail CSV
        if (rangeOrders.length > 0) {
          const orderHeaders = ["Order ID", "Date", "Time", "Source", "Customer", "Items", "Subtotal", "Discount", "GST", "Total", "Payment"];
          const orderData = rangeOrders.map(o => [
            o.id,
            new Date(o.paidAt).toLocaleDateString(),
            new Date(o.paidAt).toLocaleTimeString(),
            o.source,
            o.customerName || "",
            (o.items || []).map(i => `${i.menuItemId}x${i.qty}`).join("; "),
            currency(o.subtotal || 0),
            currency(o.discount || 0),
            currency(o.gst || 0),
            currency(o.grandTotal || 0),
            o.paymentMode || "Cash"
          ]);
          setTimeout(() => downloadFile(generateCSV(orderData, orderHeaders), `${filename}-orders.csv`, "text/csv"), 500);
        }
      } else {
        // JSON Export
        const data = {
          generatedAt: new Date().toISOString(),
          period: timeRange === "custom" ? { start: customRange.start, end: customRange.end } : timeRange,
          summary: {
            revenue: currency(rangeRevenue),
            orders: rangeOrders.length,
            avgOrder: currency(rangeAvgOrder),
            parcels: rangeParcels,
            customers: rangeCustomers,
            revenueChange: `${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(1)}%`
          },
          bestSellers,
          paymentBreakdown,
          categoryBreakdown,
          hourlyBreakdown,
          orders: rangeOrders.map(o => ({
            id: o.id,
            timestamp: o.paidAt,
            source: o.source,
            customer: o.customerName,
            items: (o.items || []).map(i => ({ name: i.menuItemId, qty: i.qty, price: i.price })),
            subtotal: o.subtotal,
            discount: o.discount,
            gst: o.gst,
            total: o.grandTotal,
            payment: o.paymentMode || "Cash"
          }))
        };
        downloadFile(JSON.stringify(data, null, 2), `${filename}.json`, "application/json");
      }
    } finally {
      setExporting(false);
      setShowExportOptions(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  const isEmpty = rangeOrders.length === 0;

  // Responsive period labels
  const periodOptions = [
    { key: "today", label: "Today", short: "Today" },
    { key: "yesterday", label: "Yesterday", short: "Yest." },
    { key: "week", label: "This Week", short: "Week" },
    { key: "lastweek", label: "Last Week", short: "Last Wk" },
    { key: "month", label: "This Month", short: "Month" },
    { key: "custom", label: "Custom Range", short: "Custom" }
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-stone-500 uppercase tracking-wide hidden sm:inline">Period</span>
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => {
                setTimeRange(e.target.value);
                setCustomRange({ start: "", end: "" });
              }}
              className="bg-stone-800 border border-stone-700 rounded-xl px-3 py-1.5 text-xs font-medium text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none pr-8 cursor-pointer"
            >
              {periodOptions.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" size={14} />
          </div>
          {timeRange === "custom" && (
            <div className="flex items-center gap-1 ml-2">
              <input
                type="date"
                value={customRange.start}
                onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                className="rounded-xl bg-stone-800 border border-stone-700 px-3 py-1.5 text-xs text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                max={new Date().toISOString().split('T')[0]}
              />
              <span className="text-stone-500 text-xs">to</span>
              <input
                type="date"
                value={customRange.end}
                onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                className="rounded-xl bg-stone-800 border border-stone-700 px-3 py-1.5 text-xs text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
          <button 
            onClick={handleRefresh} 
            disabled={loading} 
            className="rounded-xl p-2 bg-stone-800 hover:bg-stone-700 active:scale-95 transition min-w-[40px] min-h-[40px] flex items-center justify-center" 
            title="Refresh"
          >
            <RefreshCcw size={16} className={`${loading ? "animate-spin" : ""} text-stone-400`} />
          </button>
          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportOptions(!showExportOptions)}
              disabled={exporting || isEmpty}
              className="rounded-xl px-3 py-2 bg-stone-800 hover:bg-stone-700 active:scale-95 transition text-sm font-medium flex items-center gap-1.5 min-h-[40px] hidden sm:flex"
            >
              <Download size={16} className="text-stone-400" /> Export <ChevronDown size={14} className="text-stone-400" />
            </button>
            <button
              onClick={() => setShowExportOptions(!showExportOptions)}
              disabled={exporting || isEmpty}
              className="rounded-xl p-2 bg-stone-800 hover:bg-stone-700 active:scale-95 transition min-w-[40px] min-h-[40px] flex items-center justify-center sm:hidden"
              title="Export"
            >
              <Download size={16} className="text-stone-400" />
            </button>

            {showExportOptions && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportOptions(false)} />
                <div className="fixed right-4 top-20 z-50 bg-stone-900 border border-stone-800 rounded-xl shadow-xl py-1 min-w-[180px] animate-in fade-in-0 zoom-in-95">
                  <button
                    onClick={() => handleExport("json")}
                    disabled={exporting}
                    className="w-full px-4 py-2 text-left text-sm text-stone-300 hover:bg-stone-800 flex items-center gap-2 disabled:opacity-50"
                  >
                    <FileText size={16} className="text-stone-400" /> JSON Report
                  </button>
                  <button
                    onClick={() => handleExport("csv")}
                    disabled={exporting}
                    className="w-full px-4 py-2 text-left text-sm text-stone-300 hover:bg-stone-800 flex items-center gap-2 disabled:opacity-50"
                  >
                    <FileSpreadsheet size={16} className="text-stone-400" /> CSV (Multiple Files)
                  </button>
                  <div className="border-t border-stone-800 my-1" />
                  <label className="px-4 py-2 text-left text-xs text-stone-500 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked={false}
                      className="rounded border-stone-700 text-amber-500 focus:ring-amber-500"
                    />
                    Include raw order data
                  </label>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {/* Revenue Card */}
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <BarChart3 size={20} className="text-amber-400 shrink-0" />
              <span className="text-xs text-stone-400 uppercase tracking-wides">Revenue</span>
            </div>
            <div className="text-right">
              <span className={`block text-xl sm:text-2xl font-bold text-stone-100 ${revenueChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {currency(rangeRevenue)}
              </span>
              <span className={`text-xs ${revenueChange >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {revenueChange >= 0 ? `+` : ``}{revenueChange.toFixed(1)}% vs prev
              </span>
            </div>
          </div>
          {isEmpty ? (
            <div className="text-center py-4">
              <ShoppingCart size={20} className="mx-auto mb-2 text-stone-500 opacity-50" />
              <p className="text-xs text-stone-500">No sales in this period</p>
            </div>
          ) : null}
        </Card>

        {/* Orders Card */}
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <ShoppingCart size={20} className="text-blue-400 shrink-0" />
              <span className="text-xs text-stone-400 uppercase tracking-wides">Orders</span>
            </div>
            <div className="text-right">
              <span className="block text-xl sm:text-2xl font-bold text-stone-100">{rangeOrders.length}</span>
              <span className="text-xs text-stone-500">
                {rangeAvgOrder > 0 ? `Avg: ${currency(rangeAvgOrder)}` : "No data"}
              </span>
            </div>
          </div>
          {isEmpty ? (
            <div className="text-center py-4">
              <Users size={20} className="mx-auto mb-2 text-stone-500 opacity-50" />
              <p className="text-xs text-stone-500">No orders in this period</p>
            </div>
          ) : null}
        </Card>

        {/* Average Order Value */}
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Coffee size={20} className="text-brown-400 shrink-0" />
              <span className="text-xs text-stone-400 uppercase tracking-wides">Avg Order</span>
            </div>
            <div className="text-right">
              <span className="block text-xl sm:text-2xl font-bold text-stone-100">{currency(rangeAvgOrder)}</span>
              <span className="text-xs text-stone-500">
                {rangeOrders.length} orders
              </span>
            </div>
          </div>
          {isEmpty ? (
            <div className="text-center py-4">
              <Coffee size={20} className="mx-auto mb-2 text-stone-500 opacity-50" />
              <p className="text-xs text-stone-500">No orders in this period</p>
            </div>
          ) : null}
        </Card>

        {/* Customers Card */}
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-indigo-400 shrink-0" />
              <span className="text-xs text-stone-400 uppercase tracking-wides">Customers</span>
            </div>
            <div className="text-right">
              <span className="block text-xl sm:text-2xl font-bold text-stone-100">{rangeCustomers}</span>
              <span className="text-xs text-stone-500">
                {rangeCustomers > 0 ? 
                  `${((rangeCustomers / Math.max(rangeOrders.length, 1)) * 100).toFixed(0)}% return` : 
                  "No customers"}
              </span>
            </div>
          </div>
          {isEmpty ? (
            <div className="text-center py-4">
              <Users size={20} className="mx-auto mb-2 text-stone-500 opacity-50" />
              <p className="text-xs text-stone-500">No orders in this period</p>
            </div>
          ) : null}
        </Card>

        {/* Parcels Card */}
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Package size={20} className="text-green-400 shrink-0" />
              <span className="text-xs text-stone-400 uppercase tracking-wides">Parcels</span>
            </div>
            <div className="text-right">
              <span className="block text-xl sm:text-2xl font-bold text-stone-100">{rangeParcels}</span>
              <span className="text-xs text-stone-500">
                {rangeOrders.length > 0 ? 
                  `${((rangeParcels / rangeOrders.length) * 100).toFixed(0)}% of orders` : 
                  "No parcels"}
              </span>
            </div>
          </div>
          {isEmpty ? (
            <div className="text-center py-4">
              <Package size={20} className="mx-auto mb-2 text-stone-500 opacity-50" />
              <p className="text-xs text-stone-500">No orders in this period</p>
            </div>
          ) : null}
        </Card>

        {/* Payment Methods Card */}
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <CreditCard size={20} className="text-violet-400 shrink-0" />
              <span className="text-xs text-stone-400 uppercase tracking-wides">Payment Methods</span>
            </div>
            <div className="text-right">
              <span className="block text-xl sm:text-2xl font-bold text-stone-100">
                {Object.keys(paymentBreakdown).length}
              </span>
              <span className="text-xs text-stone-500">
                {Object.keys(paymentBreakdown).length > 0 ? 
                  "methods used" : 
                  "No payments"}
              </span>
            </div>
          </div>
          {isEmpty ? (
            <div className="text-center py-4">
              <CreditCard size={20} className="mx-auto mb-2 text-stone-500 opacity-50" />
              <p className="text-xs text-stone-500">No payments in this period</p>
            </div>
          ) : null}
        </Card>
      </div>

      {/* Charts Section */}
      <Card className="p-4 sm:p-5">
        <h3 className="text-sm sm:text-base font-medium text-stone-300 mb-3">Best Selling Items</h3>
        {bestSellers.length === 0 ? (
          <p className="text-sm text-stone-500">No sales yet.</p>
        ) : (
          <div style={{ width: "100%", height: 220 }} className="min-h-[220px]">
            <ResponsiveContainer>
              <BarChart data={bestSellers} layout="vertical" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#292524" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#a8a29e", fontSize: 11 }} axisLine={{ stroke: "#292524" }} tickLine={false} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fill: "#a8a29e", fontSize: 11 }} 
                  axisLine={false} 
                  tickLine={false} 
                  width={100}
                  height={60}
                />
                <Tooltip
                  contentStyle={{ background: "#1c1917", border: "1px solid #44403c" }}
                  labelStyle={{ color: "#f5f5f4" }}
                  formatter={(v) => [v, "Qty Sold"]}
                />
                <Bar
                  dataKey="qty"
                  fill="#10b981"
                  radius={[0, 4, 4, 0]}
                  maxBarWidth={40}
                >
                  {bestSellers.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={["#d97706", "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"][index % 6]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-4 sm:p-5">
        <h3 className="text-sm sm:text-base font-medium text-stone-300 mb-3">Payment Method Breakdown</h3>
        {Object.keys(paymentBreakdown).length === 0 ? (
          <p className="text-sm text-stone-500">No payments yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {Object.entries(paymentBreakdown).map(([mode, amt]) => (
              <div key={mode} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm text-stone-300 p-2 bg-stone-800/50 rounded-lg">
                <span className="font-medium">{mode}</span>
                <span className="text-stone-100 font-medium">{currency(amt)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Category Breakdown */}
      {Object.keys(categoryBreakdown).length > 0 && (
        <Card className="p-4 sm:p-5">
          <h3 className="text-sm sm:text-base font-medium text-stone-300 mb-3">Category Breakdown</h3>
          <div className="flex flex-col gap-2">
            {Object.entries(categoryBreakdown)
              .sort(([,a], [,b]) => b - a)
              .map(([cat, amt]) => (
                <div key={cat} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm text-stone-300 p-2 bg-stone-800/50 rounded-lg">
                  <span className="font-medium">{cat}</span>
                  <span className="text-stone-100 font-medium">{currency(amt)}</span>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Hourly Breakdown */}
      {Object.keys(hourlyBreakdown).length > 0 && (
        <Card className="p-4 sm:p-5">
          <h3 className="text-sm sm:text-base font-medium text-stone-300 mb-3">Hourly Revenue</h3>
          <div style={{ width: "100%", height: 200 }} className="min-h-[200px]">
            <ResponsiveContainer>
              <BarChart data={Object.entries(hourlyBreakdown).map(([hour, revenue]) => ({ hour, revenue }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#292524" />
                <XAxis dataKey="hour" tick={{ fill: "#a8a29e", fontSize: 11 }} axisLine={{ stroke: "#292524" }} tickLine={false} />
                <YAxis tick={{ fill: "#a8a29e", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => currency(v).replace("₹", "")} />
                <Tooltip
                  contentStyle={{ background: "#1c1917", border: "1px solid #44403c" }}
                  labelStyle={{ color: "#f5f5f4" }}
                  formatter={(v) => [currency(v), "Revenue"]}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarWidth={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}