import { useMemo } from "react";
import { Users, Award, Calendar, Gift, Star } from "lucide-react";
import { Card } from "./ui.jsx";
import { currency } from "../lib/currency.js";
import { daysUntilBirthday } from "../lib/loyalty.js";

export default function CRMAnalytics({ customers = [], orderHistory = [] }) {
  const metrics = useMemo(() => {
    const totalCust = customers.length;
    let totalSpendSum = 0;
    let totalOrdersSum = 0;
    let totalPointsSum = 0;
    let goldPlatinumCount = 0;

    customers.forEach((c) => {
      totalSpendSum += c.lifetimeSpend || 0;
      totalOrdersSum += c.totalOrders || c.totalVisits || 0;
      totalPointsSum += c.points || 0;
      if (c.membership === "Gold" || c.membership === "Platinum") {
        goldPlatinumCount++;
      }
    });

    const avgSpend = totalOrdersSum > 0 ? totalSpendSum / totalOrdersSum : 0;
    const returningCustCount = customers.filter(c => (c.totalOrders || c.totalVisits || 0) > 1).length;

    // Upcoming Birthdays within next 7 days
    const upcomingBirthdays = customers.filter(c => {
      const days = daysUntilBirthday(c.birthday);
      return days !== null && days <= 7;
    });

    return {
      totalCust,
      returningCustCount,
      avgSpend,
      totalPointsSum,
      goldPlatinumCount,
      upcomingBirthdays
    };
  }, [customers, orderHistory]);

  return (
    <div className="flex flex-col gap-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="p-4 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-sm">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Customers</span>
            <Users size={16} className="text-amber-500" />
          </div>
          <span className="text-2xl font-bold text-stone-50 font-serif">{metrics.totalCust}</span>
        </Card>

        <Card className="p-4 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-sm">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Returning Guests</span>
            <Star size={16} />
          </div>
          <span className="text-2xl font-bold text-emerald-400 font-serif">{metrics.returningCustCount}</span>
        </Card>

        <Card className="p-4 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-sm">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">VIP / Gold & Plat</span>
            <Award size={16} />
          </div>
          <span className="text-2xl font-bold text-amber-400 font-serif">{metrics.goldPlatinumCount}</span>
        </Card>

        <Card className="p-4 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-sm">
          <div className="flex items-center justify-between text-sky-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Avg Order Spend</span>
            <span className="text-xs font-mono font-bold">₹</span>
          </div>
          <span className="text-xl font-bold text-sky-300 font-mono">{currency(metrics.avgSpend)}</span>
        </Card>

        <Card className="p-4 bg-stone-900 border-stone-800 flex flex-col justify-between gap-2 shadow-sm">
          <div className="flex items-center justify-between text-purple-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Points Pool</span>
            <Gift size={16} />
          </div>
          <span className="text-xl font-bold text-purple-300 font-mono">{metrics.totalPointsSum} pts</span>
        </Card>
      </div>

      {/* Birthday & Anniversary Reminder Banner Widget */}
      {metrics.upcomingBirthdays.length > 0 && (
        <Card className="p-4 bg-amber-500/10 border-amber-600/30 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Calendar size={15} /> Upcoming Birthdays & Celebrations (Next 7 Days)
            </h4>
            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/40">
              Offer: Free Birthday Brownie / Dessert 🎂
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1">
            {metrics.upcomingBirthdays.map((c) => {
              const days = daysUntilBirthday(c.birthday);
              return (
                <div key={c.id} className="bg-stone-950/80 border border-stone-800 p-2.5 rounded-xl shrink-0 flex items-center gap-3">
                  <div>
                    <span className="text-xs font-bold text-stone-100 block">{c.name}</span>
                    <span className="text-[10px] text-stone-400 font-mono">{c.phone}</span>
                  </div>
                  <span className="text-xs font-bold text-amber-400 bg-stone-900 px-2 py-1 rounded-lg border border-stone-800">
                    {days === 0 ? "Today! 🎉" : `In ${days} day${days !== 1 ? "s" : ""}`}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
