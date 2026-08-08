import { useState } from "react";
import { Award, TrendingDown, Utensils } from "lucide-react";
import { Card } from "../ui.jsx";
import { currency } from "../../lib/currency.js";
import { aggregateProductPerformance } from "../../lib/reportsAggregate.js";

export function ReportsBestSellers({ orders = [], menuItems = [] }) {
  const [sortBy, setSortBy] = useState("units"); // "units" or "revenue"
  const { bestSellers, slowMovers } = aggregateProductPerformance(orders, menuItems);

  const sortedBestSellers = [...bestSellers].sort((a, b) => 
    sortBy === "revenue" ? b.revenue - a.revenue : b.unitsSold - a.unitsSold
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Top 10 Best Sellers */}
      <Card className="lg:col-span-7 p-4 bg-stone-900 border-stone-800 flex flex-col gap-3 shadow-md">
        <div className="flex justify-between items-center border-b border-stone-800 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-2">
            <Award size={16} className="text-amber-500" /> Top 10 Best Selling Items
          </h3>

          <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800">
            <button
              type="button"
              onClick={() => setSortBy("units")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                sortBy === "units" ? "bg-amber-500 text-stone-950" : "text-stone-400 hover:text-stone-200"
              }`}
            >
              By Units
            </button>
            <button
              type="button"
              onClick={() => setSortBy("revenue")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                sortBy === "revenue" ? "bg-amber-500 text-stone-950" : "text-stone-400 hover:text-stone-200"
              }`}
            >
              By Revenue
            </button>
          </div>
        </div>

        {sortedBestSellers.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-500 border border-dashed border-stone-800 rounded-xl">
            No sales recorded in selected period.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {sortedBestSellers.map((item, idx) => (
              <div key={item.id} className="flex justify-between items-center bg-stone-950 p-2.5 rounded-xl border border-stone-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-amber-500 w-5">#{idx + 1}</span>
                  <div>
                    <span className="font-bold text-stone-100 block">{item.name}</span>
                    <span className="text-[10px] text-stone-500">{item.category}</span>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <span className="font-bold text-emerald-400 block">{currency(item.revenue)}</span>
                  <span className="text-[10px] text-stone-400">{item.unitsSold} units sold ({item.orderCount} orders)</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Slow Movers */}
      <Card className="lg:col-span-5 p-4 bg-stone-900 border-stone-800 flex flex-col gap-3 shadow-md">
        <div className="flex justify-between items-center border-b border-stone-800 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <TrendingDown size={16} /> Slow Moving Items ({slowMovers.length})
          </h3>
          <span className="text-[10px] text-stone-500 font-mono">Low Sales Alert</span>
        </div>

        {slowMovers.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-500 border border-dashed border-stone-800 rounded-xl">
            All menu items performed well in this period.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {slowMovers.map((item) => (
              <div key={item.id} className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-stone-200 flex items-center gap-1">
                    <Utensils size={12} className="text-stone-500" /> {item.name}
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {item.unitsSold} sold • {currency(item.revenue)}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/30">
                  {item.recommendation}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
