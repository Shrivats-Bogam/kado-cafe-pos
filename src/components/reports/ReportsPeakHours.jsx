import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Card } from "../ui.jsx";
import { getPeakHours } from "../../lib/reportsAggregate.js";

export function ReportsPeakHours({ orders }) {
  const peakData = useMemo(() => getPeakHours(orders), [orders]);

  return (
    <Card className="p-4 flex flex-col gap-4">
      <h3 className="font-serif text-lg font-bold text-stone-50">Peak Hours</h3>
      {peakData.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-stone-500 text-sm">No data available.</div>
      ) : (
        <div className="w-full h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={peakData}>
              <defs>
                <linearGradient id="colorPeak" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
              <XAxis dataKey="hour" tick={{ fill: "#a8a29e", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis 
                tick={{ fill: "#a8a29e", fontSize: 11 }} 
                axisLine={false} 
                tickLine={false} 
                allowDecimals={false}
                width={30}
              />
              <Tooltip 
                contentStyle={{ background: "#1c1917", border: "1px solid #44403c", borderRadius: "8px" }} 
                itemStyle={{ color: "#a78bfa", fontWeight: "bold" }}
                formatter={(val) => [val, "Orders"]}
              />
              <Area type="monotone" dataKey="orders" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorPeak)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
