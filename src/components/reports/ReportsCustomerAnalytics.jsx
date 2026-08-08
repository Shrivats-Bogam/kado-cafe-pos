import { Users, Award, Gift, UserCheck } from "lucide-react";
import { Card } from "../ui.jsx";
import { currency } from "../../lib/currency.js";

export function ReportsCustomerAnalytics({ orders = [], customers = [] }) {
  const totalCust = customers.length;
  const returningCust = customers.filter((c) => (c.totalOrders || c.totalVisits || 0) > 1).length;
  const newCust = Math.max(0, totalCust - returningCust);
  const repeatRate = totalCust > 0 ? Math.round((returningCust / totalCust) * 100) : 0;

  const silverCount = customers.filter((c) => (c.membership || "Silver") === "Silver").length;
  const goldCount = customers.filter((c) => c.membership === "Gold").length;
  const platCount = customers.filter((c) => c.membership === "Platinum").length;

  const totalPointsActive = customers.reduce((sum, c) => sum + (c.points || 0), 0);

  return (
    <Card className="p-4 bg-stone-900 border-stone-800 flex flex-col gap-3 shadow-md">
      <div className="flex justify-between items-center border-b border-stone-800 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-2">
          <Users size={16} className="text-amber-500" /> CRM & Loyalty Intelligence
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
          <span className="text-[10px] text-stone-500 uppercase font-bold block">Repeat Rate</span>
          <span className="text-base font-bold text-amber-400 font-serif">{repeatRate}%</span>
          <span className="text-[10px] text-stone-400 block mt-0.5">{returningCust} returning / {totalCust} total</span>
        </div>

        <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
          <span className="text-[10px] text-stone-500 uppercase font-bold block">Active Points</span>
          <span className="text-base font-bold text-purple-400 font-mono flex items-center gap-1">
            <Gift size={14} /> {totalPointsActive.toLocaleString()} pts
          </span>
          <span className="text-[10px] text-stone-400 block mt-0.5">Across all profiles</span>
        </div>
      </div>

      {/* Tier Distribution */}
      <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800 space-y-1 text-xs">
        <span className="text-[10px] uppercase font-bold text-stone-500 block">Membership Tiers</span>
        <div className="grid grid-cols-3 gap-1 text-center font-mono">
          <div className="bg-stone-900 p-1.5 rounded-lg border border-stone-800">
            <span className="text-[10px] text-stone-400 block">🥈 Silver</span>
            <span className="font-bold text-stone-200">{silverCount}</span>
          </div>
          <div className="bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/30">
            <span className="text-[10px] text-amber-400 block">🥇 Gold</span>
            <span className="font-bold text-amber-300">{goldCount}</span>
          </div>
          <div className="bg-purple-500/10 p-1.5 rounded-lg border border-purple-500/30">
            <span className="text-[10px] text-purple-300 block">💎 Platinum</span>
            <span className="font-bold text-purple-300">{platCount}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
