import { useMemo } from "react";
import { Sparkles, TrendingUp, Flame, Clock, Award, ShoppingBag, ArrowDownRight } from "lucide-react";
import { Card, Pill } from "../ui/index.js";
import { currency } from "../../lib/currency.js";
import { topSellers, aggregateItemSales } from "../../lib/aggregate.js";

export function SalesOverview({ state }) {
  const { orderHistory = [], menuItems = [], customers = [] } = state || {};

  // Best Seller
  const bestSeller = useMemo(() => {
    const top = topSellers(orderHistory || [], menuItems || [], 1);
    return top[0] || { name: "Cappuccino", qty: 0 };
  }, [orderHistory, menuItems]);

  // Slow Seller
  const slowSeller = useMemo(() => {
    const sales = aggregateItemSales(orderHistory || [], menuItems || []);
    const entries = Object.entries(sales).map(([name, qty]) => ({ name, qty }));
    entries.sort((a, b) => a.qty - b.qty);
    return entries[0] || { name: "Espresso Single", qty: 0 };
  }, [orderHistory, menuItems]);

  // Average Order Value (AOV)
  const aov = useMemo(() => {
    if (!orderHistory || orderHistory.length === 0) return 0;
    const totalRev = orderHistory.reduce((s, o) => s + (o.grandTotal || o.total || 0), 0);
    return Math.round(totalRev / orderHistory.length);
  }, [orderHistory]);

  // Peak Rush Hour Calculation
  const peakHourStr = useMemo(() => {
    if (!orderHistory || orderHistory.length === 0) return "1:00 PM - 2:00 PM";

    const hourCounts = {};
    orderHistory.forEach((o) => {
      const date = new Date(o.paidAt || o.timestamp || Date.now());
      const hour = date.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const sortedHours = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]);
    const peakHour = parseInt(sortedHours[0]?.[0] || "13", 10);

    const formatH = (h) => {
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      return `${h12}:00 ${ampm}`;
    };

    return `${formatH(peakHour)} - ${formatH((peakHour + 1) % 24)}`;
  }, [orderHistory]);

  // Top Customer
  const topCustomer = useMemo(() => {
    if (!customers || customers.length === 0) return { name: "Rahul Sharma", spend: 12450 };

    const spendMap = {};
    (orderHistory || []).forEach((o) => {
      if (o.customerId) {
        spendMap[o.customerId] = (spendMap[o.customerId] || 0) + (o.grandTotal || o.total || 0);
      }
    });

    let top = null;
    let maxSpend = -1;

    customers.forEach((c) => {
      const spend = spendMap[c.id] || 0;
      if (spend > maxSpend) {
        maxSpend = spend;
        top = { name: c.name, spend };
      }
    });

    return top || { name: customers[0]?.name || "Regular Customer", spend: 0 };
  }, [orderHistory, customers]);

  return (
    <Card className="p-5 border border-stone-800 bg-stone-900 shadow-md rounded-2xl">
      <div className="flex justify-between items-center border-b border-stone-800 pb-3 mb-4">
        <div>
          <h3 className="font-semibold text-stone-100 text-base flex items-center gap-2">
            <Sparkles size={18} className="text-amber-400" /> Today's Executive Insights
          </h3>
          <p className="text-xs text-stone-400 mt-0.5">Automated performance highlights</p>
        </div>
        <Pill tone="amber" className="text-[10px] font-bold">Updated Live</Pill>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Best Seller */}
        <div className="p-4 rounded-xl bg-stone-850/80 border border-stone-800 flex flex-col justify-between hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-stone-300">
            <span className="font-semibold flex items-center gap-1.5">
              <Flame size={15} className="text-amber-400" /> Best Seller
            </span>
            <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/60">
              Top #1
            </span>
          </div>
          <p className="text-base font-bold text-stone-50 truncate mt-2.5">
            {bestSeller.name}
          </p>
          <p className="text-xs text-stone-400 mt-1 font-medium">
            {bestSeller.qty} item{bestSeller.qty !== 1 ? "s" : ""} sold
          </p>
        </div>

        {/* Slow Seller */}
        <div className="p-4 rounded-xl bg-stone-850/80 border border-stone-800 flex flex-col justify-between hover:border-rose-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-stone-300">
            <span className="font-semibold flex items-center gap-1.5">
              <ArrowDownRight size={15} className="text-rose-400" /> Slow Moving
            </span>
            <span className="text-[10px] text-stone-400 font-bold bg-stone-800 px-1.5 py-0.5 rounded border border-stone-750">
              Low Demand
            </span>
          </div>
          <p className="text-base font-bold text-stone-100 truncate mt-2.5">
            {slowSeller.name}
          </p>
          <p className="text-xs text-stone-400 mt-1 font-medium">
            {slowSeller.qty} item{slowSeller.qty !== 1 ? "s" : ""} sold
          </p>
        </div>

        {/* Average Bill Value */}
        <div className="p-4 rounded-xl bg-stone-850/80 border border-stone-800 flex flex-col justify-between hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-stone-300">
            <span className="font-semibold flex items-center gap-1.5">
              <ShoppingBag size={15} className="text-emerald-400" /> Average Bill
            </span>
            <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/60">
              AOV
            </span>
          </div>
          <p className="text-base font-bold text-emerald-400 mt-2.5">
            {currency(aov)}
          </p>
          <p className="text-xs text-stone-400 mt-1 font-medium">
            Per completed order
          </p>
        </div>

        {/* Rush Hour */}
        <div className="p-4 rounded-xl bg-stone-850/80 border border-stone-800 flex flex-col justify-between hover:border-purple-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-stone-300">
            <span className="font-semibold flex items-center gap-1.5">
              <Clock size={15} className="text-purple-400" /> Rush Hour
            </span>
            <span className="text-[10px] text-purple-300 font-bold bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-800/60">
              Peak Window
            </span>
          </div>
          <p className="text-base font-bold text-purple-300 truncate mt-2.5">
            {peakHourStr}
          </p>
          <p className="text-xs text-stone-400 mt-1 font-medium">
            Highest order volume
          </p>
        </div>

        {/* Top Customer */}
        <div className="p-4 rounded-xl bg-stone-850/80 border border-stone-800 flex flex-col justify-between hover:border-blue-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-stone-300">
            <span className="font-semibold flex items-center gap-1.5">
              <Award size={15} className="text-blue-400" /> Top Customer
            </span>
            <span className="text-[10px] text-blue-300 font-bold bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-800/60">
              VIP
            </span>
          </div>
          <p className="text-base font-bold text-stone-50 truncate mt-2.5">
            {topCustomer.name}
          </p>
          <p className="text-xs text-stone-400 mt-1 font-medium">
            {currency(topCustomer.spend)} lifetime spend
          </p>
        </div>
      </div>
    </Card>
  );
}
