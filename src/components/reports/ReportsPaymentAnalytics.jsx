import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card } from "../ui.jsx";
import { currency } from "../../lib/currency.js";
import { getPaymentBreakdown } from "../../lib/reportsAggregate.js";

const COLORS = {
  Cash: "#10b981",    // emerald
  UPI: "#3b82f6",     // blue
  Card: "#f59e0b",    // amber
  Split: "#8b5cf6",   // purple
  Pending: "#f43f5e", // rose
  Refunded: "#64748b" // slate
};

export function ReportsPaymentAnalytics({ orders }) {
  const data = useMemo(() => getPaymentBreakdown(orders), [orders]);

  return (
    <Card className="p-4 flex flex-col gap-4">
      <h3 className="font-serif text-lg font-bold text-stone-50">Payment Breakdown</h3>
      {data.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-stone-500 text-sm">No payment data available.</div>
      ) : (
        <div className="w-full h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name] || "#a8a29e"} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ background: "#1c1917", border: "1px solid #44403c", borderRadius: "8px" }}
                itemStyle={{ fontWeight: "bold" }}
                formatter={(val) => currency(val)}
              />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: '#a8a29e' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
