import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Card } from "../ui.jsx";
import { currency } from "../../lib/currency.js";
import { formatDate, formatTime } from "../../lib/dateUtils.js";

export function ReportsSalesTrend({ orders, range }) {
  const data = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      if (!o.paidAt) return;
      // Group by hour for 'today' and 'yesterday', else group by day
      let key = "";
      let label = "";
      
      if (range === "today" || range === "yesterday") {
        const d = new Date(o.paidAt);
        key = `${d.getHours()}:00`;
        label = formatTime(o.paidAt);
      } else {
        key = o.paidAt.slice(0, 10);
        label = formatDate(o.paidAt);
      }

      if (!map[key]) {
        map[key] = { key, label, revenue: 0 };
      }
      map[key].revenue += (o.grandTotal || 0);
    });

    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
  }, [orders, range]);

  return (
    <Card className="p-4 flex flex-col gap-4">
      <h3 className="font-serif text-lg font-bold text-stone-50">Sales Trend</h3>
      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-stone-500 text-sm">No sales data in this period.</div>
      ) : (
        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
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
                width={60}
              />
              <Tooltip 
                contentStyle={{ background: "#1c1917", border: "1px solid #44403c", borderRadius: "8px" }} 
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
