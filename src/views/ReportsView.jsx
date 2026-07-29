import { useMemo } from "react";
import { BarChart3, ShoppingCart, Coffee } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Card, StatCard } from "../components/ui.jsx";
import { currency } from "../lib/currency.js";
import { topSellers, totalRevenue } from "../lib/aggregate.js";

export default function ReportsView({ orderHistory, menuItems }) {
  const allRevenue = useMemo(() => totalRevenue(orderHistory), [orderHistory]);
  const avgOrder = orderHistory.length ? allRevenue / orderHistory.length : 0;

  const bestSellers = useMemo(
    () => topSellers(orderHistory, menuItems, 6),
    [orderHistory, menuItems]
  );

  const paymentBreakdown = useMemo(() => {
    const counts = {};
    orderHistory.forEach((o) => {
      const mode = o.paymentMode || "Cash";
      counts[mode] = (counts[mode] || 0) + (o.grandTotal || 0);
    });
    return counts;
  }, [orderHistory]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Total Revenue" value={currency(allRevenue)} icon={BarChart3} />
        <StatCard label="Total Orders" value={orderHistory.length} icon={ShoppingCart} />
        <StatCard label="Avg Order Value" value={currency(avgOrder)} icon={Coffee} />
      </div>

      <Card className="p-4">
        <h3 className="text-sm font-medium text-stone-300 mb-3">Best Selling Items</h3>
        {bestSellers.length === 0 ? (
          <p className="text-sm text-stone-500">No sales yet.</p>
        ) : (
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={bestSellers}>
                <CartesianGrid strokeDasharray="3 3" stroke="#292524" />
                <XAxis dataKey="name" tick={{ fill: "#a8a29e", fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fill: "#a8a29e", fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#1c1917", border: "1px solid #44403c" }} labelStyle={{ color: "#f5f5f4" }} />
                <Bar dataKey="qty" fill="#d97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-medium text-stone-300 mb-3">Payment Method Breakdown</h3>
        {Object.keys(paymentBreakdown).length === 0 ? (
          <p className="text-sm text-stone-500">No payments yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {Object.entries(paymentBreakdown).map(([mode, amt]) => (
              <div key={mode} className="flex justify-between text-sm text-stone-300">
                <span>{mode}</span><span>{currency(amt)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
