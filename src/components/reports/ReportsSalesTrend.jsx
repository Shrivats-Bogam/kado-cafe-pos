import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Card } from "../ui.jsx";
import { currency } from "../../lib/currency.js";
import { formatDate, formatTime } from "../../lib/dateUtils.js";

export function ReportsSalesTrend({ orders = [], range = "all" }) {
  const data = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      if (o.status !== "Paid") return;
      const timeVal = o.paidAt || o.createdAt;
      if (!timeVal) return;

      let key = "";
      let label = "";
      
      if (range === "today" || range === "yesterday") {
        const d = new Date(timeVal);
        const h = d.getHours();
        key = `${String(h).padStart(2, "0")}:00`;
        label = formatTime(timeVal);
      } else {
        key = timeVal.slice(0, 10);
        label = formatDate(timeVal);
      }

      if (!map[key]) {
        map[key] = { key, label, revenue: 0, count: 0 };
      }
      map[key].revenue += Number(o.grandTotal) || 0;
      map[key].count += 1;
    });

    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
  }, [orders, range]);

  return (
    <Card className="p-4 bg-stone-900 border-stone-800 flex flex-col gap-3 shadow-md">
      <div className="flex justify-between items-center border-b border-stone-800 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300">Revenue Trend</h3>
        <span className="text-[10px] text-stone-500 font-mono">Paid Collected Revenue</span>
      </div>

      {data.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center text-stone-500 text-xs border border-dashed border-stone-800 rounded-xl">
          No paid sales data recorded in this period.
        </div>
      ) : (
        <div className="w-full h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#a8a29e", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis 
                tick={{ fill: "#a8a29e", fontSize: 11 }} 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={(val) => `₹${val}`}
                width={55}
              />
              <Tooltip 
                contentStyle={{ background: "#1c1917", border: "1px solid #44403c", borderRadius: "12px" }} 
                itemStyle={{ color: "#f59e0b", fontWeight: "bold" }}
                formatter={(val) => [currency(val), "Revenue"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
