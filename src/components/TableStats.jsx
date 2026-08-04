import { Coffee, CheckCircle2, Clock, Banknote } from "lucide-react";
import { currency, orderTotal } from "../lib/currency.js";

export default function TableStats({ tables, menuItems }) {
  const totalTables = tables.length;

  const availableCount = tables.filter((t) => t.status === "available").length;

  const occupiedTables = tables.filter(
    (t) => t.items.length > 0 || ["preparing", "serving", "ordering", "ready", "billing", "payment_pending"].includes(t.status)
  );

  const occupiedCount = occupiedTables.length;

  const activeRevenue = occupiedTables.reduce((sum, t) => {
    const { grandTotal } = orderTotal(t.items, menuItems);
    return sum + grandTotal;
  }, 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">Total Tables</p>
          <p className="text-xl font-bold text-stone-100 mt-0.5">{totalTables}</p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-stone-800/80 flex items-center justify-center text-amber-500">
          <Coffee size={18} />
        </div>
      </div>

      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">Available</p>
          <p className="text-xl font-bold text-emerald-400 mt-0.5">{availableCount}</p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 size={18} />
        </div>
      </div>

      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">Occupied</p>
          <p className="text-xl font-bold text-sky-400 mt-0.5">{occupiedCount}</p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-500/20">
          <Clock size={18} />
        </div>
      </div>

      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">Active Bills</p>
          <p className="text-xl font-bold text-amber-400 mt-0.5">{currency(activeRevenue)}</p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
          <Banknote size={18} />
        </div>
      </div>
    </div>
  );
}
