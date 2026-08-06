import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Card, Pill } from "../ui.jsx";
import { topSellers } from "../../lib/aggregate.js";
import { getSlowMovers } from "../../lib/reportsAggregate.js";

export function ReportsBestSellers({ orders, menuItems }) {
  const topItems = useMemo(() => topSellers(orders, menuItems, 5), [orders, menuItems]);
  const slowMovers = useMemo(() => getSlowMovers(orders, menuItems), [orders, menuItems]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="p-4 flex flex-col gap-4">
        <h3 className="font-serif text-lg font-bold text-stone-50">Best Selling Items</h3>
        {topItems.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-stone-500 text-sm">No data available.</div>
        ) : (
          <div className="w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topItems} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#292524" horizontal={true} vertical={false} />
                <XAxis type="number" tick={{ fill: "#a8a29e", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#a8a29e", fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip 
                  contentStyle={{ background: "#1c1917", border: "1px solid #44403c", borderRadius: "8px" }} 
                  itemStyle={{ color: "#f59e0b", fontWeight: "bold" }}
                />
                <Bar dataKey="qty" fill="#d97706" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-4 flex flex-col gap-4 overflow-hidden">
        <h3 className="font-serif text-lg font-bold text-stone-50">Slow Moving Items</h3>
        {slowMovers.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-stone-500 text-sm">All items are selling well.</div>
        ) : (
          <div className="overflow-x-auto h-[250px] no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[300px]">
              <thead>
                <tr className="border-b border-stone-800">
                  <th className="py-2 text-xs font-semibold text-stone-400">Item Name</th>
                  <th className="py-2 text-xs font-semibold text-stone-400">Category</th>
                  <th className="py-2 text-xs font-semibold text-stone-400 text-right">Sold</th>
                  <th className="py-2 text-xs font-semibold text-stone-400 text-right">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {slowMovers.map((item, i) => (
                  <tr key={i} className="border-b border-stone-800/50 hover:bg-stone-800/20">
                    <td className="py-3 text-sm text-stone-200">{item.name}</td>
                    <td className="py-3 text-sm text-stone-400">{item.category}</td>
                    <td className="py-3 text-sm font-semibold text-stone-200 text-right">{item.qty}</td>
                    <td className="py-3 text-right">
                      <Pill tone={item.action === "Promote" ? "sky" : "rose"}>{item.action}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
