import { useMemo } from "react";
import { Users, UserCheck, Gift, CreditCard } from "lucide-react";
import { Card } from "../ui.jsx";
import { currency } from "../../lib/currency.js";
import { getCustomerAnalytics } from "../../lib/reportsAggregate.js";

function MiniStat({ label, value, icon: Icon, accent }) {
  return (
    <div className="flex items-center justify-between p-3 bg-stone-950 border border-stone-800 rounded-xl">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold text-stone-400">{label}</span>
        <span className="text-lg font-serif font-bold text-stone-50">{value}</span>
      </div>
      <div className={`p-2 rounded-lg bg-stone-800 ${accent}`}>
        <Icon size={18} />
      </div>
    </div>
  );
}

export function ReportsCustomerAnalytics({ orders, customers }) {
  const stats = useMemo(() => getCustomerAnalytics(orders, customers), [orders, customers]);

  return (
    <Card className="p-4 flex flex-col gap-4">
      <h3 className="font-serif text-lg font-bold text-stone-50">Customer Analytics</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MiniStat label="New Customers" value={stats.newCustomers} icon={Users} accent="text-amber-500" />
        <MiniStat label="Returning Customers" value={stats.returningCustomers} icon={UserCheck} accent="text-emerald-500" />
        <MiniStat label="Avg Customer Spend" value={currency(stats.avgSpend)} icon={CreditCard} accent="text-sky-500" />
        <MiniStat label="Loyalty Redemptions" value={`-${currency(stats.redemptions)}`} icon={Gift} accent="text-rose-500" />
      </div>
      <div className="mt-2">
        <span className="text-xs font-semibold text-stone-400 mb-2 block">Membership Distribution</span>
        <div className="flex h-4 rounded-full overflow-hidden w-full bg-stone-800">
          <div style={{ width: `${(stats.tiers.silver / Math.max(1, customers.length)) * 100}%` }} className="bg-stone-400" title={`Silver: ${stats.tiers.silver}`} />
          <div style={{ width: `${(stats.tiers.gold / Math.max(1, customers.length)) * 100}%` }} className="bg-amber-400" title={`Gold: ${stats.tiers.gold}`} />
          <div style={{ width: `${(stats.tiers.platinum / Math.max(1, customers.length)) * 100}%` }} className="bg-sky-400" title={`Platinum: ${stats.tiers.platinum}`} />
        </div>
        <div className="flex justify-between mt-1 px-1">
          <span className="text-[10px] text-stone-500">Silver ({stats.tiers.silver})</span>
          <span className="text-[10px] text-stone-500">Gold ({stats.tiers.gold})</span>
          <span className="text-[10px] text-stone-500">Platinum ({stats.tiers.platinum})</span>
        </div>
      </div>
    </Card>
  );
}
