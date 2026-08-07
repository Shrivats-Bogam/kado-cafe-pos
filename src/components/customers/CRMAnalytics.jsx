import { useMemo } from "react";
import { Users, UserCheck, Sparkles, Award, Cake, Heart, TrendingUp, ChevronRight, Star, ShoppingBag } from "lucide-react";
import { Card, Pill, StatCard } from "../ui/index.js";
import { currency } from "../../lib/currency.js";
import { daysUntilBirthday } from "../../lib/loyalty.js";
import { getCustomerTier, formatRelativeDate } from "./CustomerCard.jsx";

export function CRMAnalytics({ customers = [], orderHistory = [], onSelectCustomer }) {
  // Aggregate Metrics
  const totalCustomers = customers.length;

  // Map order history per customer for total spend & orders
  const customerSpends = useMemo(() => {
    const map = {};
    orderHistory.forEach((order) => {
      const cId = order.customerId;
      const phone = order.phone;
      const amount = order.grandTotal || order.total || 0;
      if (cId) {
        map[cId] = (map[cId] || 0) + amount;
      } else if (phone) {
        const found = customers.find((c) => c.phone === phone);
        if (found) {
          map[found.id] = (map[found.id] || 0) + amount;
        }
      }
    });
    return map;
  }, [customers, orderHistory]);

  const returningCustomers = useMemo(() => {
    return customers.filter((c) => (c.totalOrders || 0) > 1).length;
  }, [customers]);

  const newCustomers = useMemo(() => {
    return customers.filter((c) => (c.totalOrders || 0) <= 1).length;
  }, [customers]);

  const totalPoints = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.points || 0), 0);
  }, [customers]);

  const totalRevenueFromCustomers = useMemo(() => {
    return Object.values(customerSpends).reduce((sum, val) => sum + val, 0);
  }, [customerSpends]);

  const avgSpendPerCustomer = totalCustomers > 0 ? Math.round(totalRevenueFromCustomers / totalCustomers) : 0;

  // Membership Tier Distribution
  const tierCounts = useMemo(() => {
    const counts = { Platinum: 0, Gold: 0, Silver: 0, Bronze: 0 };
    customers.forEach((c) => {
      const spend = customerSpends[c.id] || 0;
      const tier = getCustomerTier(spend, c.points || 0);
      counts[tier.name] = (counts[tier.name] || 0) + 1;
    });
    return counts;
  }, [customers, customerSpends]);

  // Birthday Reminders (Next 30 days)
  const birthdayReminders = useMemo(() => {
    return customers
      .map((c) => {
        const days = daysUntilBirthday(c.birthday);
        return { customer: c, days };
      })
      .filter((item) => item.days !== null && item.days <= 30)
      .sort((a, b) => a.days - b.days);
  }, [customers]);

  // Anniversary Reminders (Next 30 days)
  const anniversaryReminders = useMemo(() => {
    return customers
      .map((c) => {
        const days = daysUntilBirthday(c.anniversary);
        return { customer: c, days };
      })
      .filter((item) => item.days !== null && item.days <= 30)
      .sort((a, b) => a.days - b.days);
  }, [customers]);

  // Top 5 Spending Customers Leaderboard
  const topSpenders = useMemo(() => {
    return customers
      .map((c) => ({
        customer: c,
        spend: customerSpends[c.id] || 0,
      }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);
  }, [customers, customerSpends]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Executive Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          label="Total Customers"
          value={totalCustomers}
          icon={Users}
        />
        <StatCard
          label="Returning Rate"
          value={totalCustomers > 0 ? `${Math.round((returningCustomers / totalCustomers) * 100)}%` : "0%"}
          icon={UserCheck}
        />
        <StatCard
          label="Total Points"
          value={totalPoints.toLocaleString()}
          icon={Star}
        />
        <StatCard
          label="Avg Spend / Customer"
          value={currency(avgSpendPerCustomer)}
          icon={ShoppingBag}
        />
        <StatCard
          label="New Customers"
          value={newCustomers}
          icon={Sparkles}
        />
      </div>

      {/* Tier Breakdown + Reminders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tier Distribution */}
        <Card className="p-5 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-stone-800 pb-3">
            <h3 className="font-semibold text-sm text-stone-100 flex items-center gap-2">
              <Award size={16} className="text-amber-400" /> Membership Tier Distribution
            </h3>
            <span className="text-xs text-stone-500">{totalCustomers} total</span>
          </div>

          <div className="space-y-3">
            {[
              { name: "Platinum", count: tierCounts.Platinum, tone: "bg-purple-500", textTone: "text-purple-300", icon: "👑" },
              { name: "Gold", count: tierCounts.Gold, tone: "bg-amber-500", textTone: "text-amber-300", icon: "⭐" },
              { name: "Silver", count: tierCounts.Silver, tone: "bg-slate-400", textTone: "text-slate-300", icon: "🥈" },
              { name: "Bronze", count: tierCounts.Bronze, tone: "bg-emerald-500", textTone: "text-emerald-300", icon: "🥉" },
            ].map((tier) => {
              const percentage = totalCustomers > 0 ? Math.round((tier.count / totalCustomers) * 100) : 0;
              return (
                <div key={tier.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className={`flex items-center gap-1 ${tier.textTone}`}>
                      <span>{tier.icon}</span> {tier.name}
                    </span>
                    <span className="text-stone-400">
                      {tier.count} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full ${tier.tone} transition-all duration-300`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Birthday Reminders Widget */}
        <Card className="p-5 flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-stone-800 pb-3">
            <h3 className="font-semibold text-sm text-stone-100 flex items-center gap-2">
              <Cake size={16} className="text-amber-400" /> Birthday Reminders
            </h3>
            <Pill tone="amber" className="text-[10px]">{birthdayReminders.length} upcoming</Pill>
          </div>

          {birthdayReminders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-stone-500 text-xs">
              <p>No upcoming birthdays in the next 30 days.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {birthdayReminders.map(({ customer, days }) => (
                <div
                  key={customer.id}
                  onClick={() => onSelectCustomer(customer)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-stone-850 border border-stone-800 hover:border-amber-500/40 cursor-pointer transition-all group"
                >
                  <div>
                    <p className="text-xs font-semibold text-stone-200 group-hover:text-amber-300 transition-colors">
                      {customer.name}
                    </p>
                    <p className="text-[11px] text-stone-500">{customer.phone}</p>
                  </div>
                  <Pill tone={days === 0 ? "amber" : "slate"} className="text-[10px] font-bold">
                    {days === 0 ? "Today! 🎂" : `In ${days} days`}
                  </Pill>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Anniversary Reminders Widget */}
        <Card className="p-5 flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-stone-800 pb-3">
            <h3 className="font-semibold text-sm text-stone-100 flex items-center gap-2">
              <Heart size={16} className="text-rose-400" /> Anniversary Reminders
            </h3>
            <Pill tone="slate" className="text-[10px]">{anniversaryReminders.length} upcoming</Pill>
          </div>

          {anniversaryReminders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-stone-500 text-xs">
              <p>No upcoming anniversaries in the next 30 days.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {anniversaryReminders.map(({ customer, days }) => (
                <div
                  key={customer.id}
                  onClick={() => onSelectCustomer(customer)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-stone-850 border border-stone-800 hover:border-rose-500/40 cursor-pointer transition-all group"
                >
                  <div>
                    <p className="text-xs font-semibold text-stone-200 group-hover:text-rose-300 transition-colors">
                      {customer.name}
                    </p>
                    <p className="text-[11px] text-stone-500">{customer.phone}</p>
                  </div>
                  <Pill tone={days === 0 ? "rose" : "slate"} className="text-[10px] font-bold">
                    {days === 0 ? "Today! 💍" : `In ${days} days`}
                  </Pill>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Top Spending Customers Leaderboard */}
      <Card className="p-5 flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-stone-800 pb-3">
          <div>
            <h3 className="font-semibold text-base text-stone-100 flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-400" /> Top Spending Customers Leaderboard
            </h3>
            <p className="text-xs text-stone-500">Highest value customers ranked by total spend</p>
          </div>
        </div>

        {topSpenders.length === 0 ? (
          <p className="text-xs text-stone-500 italic text-center py-6">
            No order history recorded yet to rank customer spend.
          </p>
        ) : (
          <div className="space-y-2">
            {topSpenders.map(({ customer, spend }, index) => {
              const tier = getCustomerTier(spend, customer.points || 0);
              const rankIcons = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
              return (
                <div
                  key={customer.id}
                  onClick={() => onSelectCustomer(customer)}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-stone-850/80 border border-stone-800 hover:border-amber-500/40 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg shrink-0">{rankIcons[index] || `#${index + 1}`}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-stone-100 group-hover:text-amber-300 transition-colors truncate">
                          {customer.name}
                        </p>
                        <Pill tone={tier.tone} className="text-[10px] px-2 py-0.5 font-medium shrink-0">
                          {tier.name}
                        </Pill>
                      </div>
                      <p className="text-xs text-stone-400 flex items-center gap-2 mt-0.5">
                        <span>{customer.phone}</span>
                        <span>•</span>
                        <span>{customer.points || 0} pts</span>
                        <span>•</span>
                        <span>Last visit: {formatRelativeDate(customer.lastVisit)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400">{currency(spend)}</p>
                      <p className="text-[11px] text-stone-500">{customer.totalOrders || 0} visits</p>
                    </div>
                    <ChevronRight size={16} className="text-stone-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
