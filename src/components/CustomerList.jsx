import { useState, useMemo } from "react";
import { Search, Plus, Phone, Trash2, Award, Gift, Calendar, Eye } from "lucide-react";
import { Card, PrimaryButton } from "./ui.jsx";
import { currency } from "../lib/currency.js";
import { daysUntilBirthday } from "../lib/loyalty.js";

export default function CustomerList({ 
  customers = [], 
  onSelectCustomer, 
  onAddCustomer, 
  onDeleteCustomer 
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("All");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      // Tier Filter
      if (tierFilter === "Silver" && (c.membership || "Silver") !== "Silver") return false;
      if (tierFilter === "Gold" && c.membership !== "Gold") return false;
      if (tierFilter === "Platinum" && c.membership !== "Platinum") return false;
      if (tierFilter === "Top Spenders" && (c.lifetimeSpend || 0) < 10000) return false;
      if (tierFilter === "New" && (c.totalOrders || c.totalVisits || 0) > 2) return false;

      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = (c.name || "").toLowerCase().includes(q);
        const matchPhone = (c.phone || "").includes(q);
        const matchEmail = (c.email || "").toLowerCase().includes(q);
        return matchName || matchPhone || matchEmail;
      }

      return true;
    }).sort((a, b) => (b.lifetimeSpend || 0) - (a.lifetimeSpend || 0));
  }, [customers, tierFilter, searchQuery]);

  const paginated = useMemo(() => {
    return filtered.slice(0, page * PAGE_SIZE);
  }, [filtered, page]);

  return (
    <div className="flex flex-col gap-4">
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-stone-900 p-3 rounded-2xl border border-stone-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, phone, or email..."
            className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-4 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {["All", "Silver", "Gold", "Platinum", "Top Spenders", "New"].map((f) => (
            <button
              key={f}
              onClick={() => setTierFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
                tierFilter === f
                  ? "bg-amber-500 text-stone-950 shadow-sm"
                  : "bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200"
              }`}
            >
              {f}
            </button>
          ))}

          <PrimaryButton
            onClick={onAddCustomer}
            className="min-h-[44px] px-4 text-xs font-bold shrink-0 active:scale-95 ml-auto"
          >
            <Plus size={16} /> New Customer
          </PrimaryButton>
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-stone-500 text-sm">
            No customers found matching search criteria.
          </div>
        ) : (
          paginated.map((c) => {
            const tier = c.membership || "Silver";
            let tierBadge = "bg-stone-800 text-stone-400 border-stone-700";
            if (tier === "Gold") tierBadge = "bg-amber-500/15 text-amber-400 border-amber-500/30 font-bold";
            else if (tier === "Platinum") tierBadge = "bg-purple-500/15 text-purple-300 border-purple-500/30 font-bold";

            const dUntil = daysUntilBirthday(c.birthday);

            return (
              <Card key={c.id} className="p-4 bg-stone-900 border-stone-800 flex flex-col justify-between gap-3 shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-serif font-bold text-stone-100 text-base">{c.name}</h4>
                    <span className="text-xs text-stone-400 flex items-center gap-1 mt-0.5 font-mono">
                      <Phone size={12} className="text-amber-500" /> {c.phone}
                    </span>
                  </div>
                  <span className={`px-2.5 py-0.5 text-[10px] rounded-full border ${tierBadge}`}>
                    <Award size={10} className="inline mr-0.5" /> {tier}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                  <div>
                    <span className="text-stone-500 text-[10px] block uppercase font-bold">Lifetime Spend</span>
                    <span className="font-mono font-bold text-amber-400">{currency(c.lifetimeSpend || 0)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-stone-500 text-[10px] block uppercase font-bold">Loyalty Points</span>
                    <span className="font-mono font-bold text-purple-400 flex items-center justify-end gap-1">
                      <Gift size={11} /> {c.points || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 text-[10px] block uppercase font-bold">Visits</span>
                    <span className="font-mono text-stone-300">{c.totalOrders || c.totalVisits || 0} orders</span>
                  </div>
                  <div className="text-right">
                    <span className="text-stone-500 text-[10px] block uppercase font-bold">Last Visit</span>
                    <span className="text-[11px] text-stone-300">
                      {c.lastVisit ? new Date(c.lastVisit).toLocaleDateString() : "—"}
                    </span>
                  </div>
                </div>

                {/* Birthday Banner */}
                {dUntil !== null && dUntil <= 7 && (
                  <div className="bg-amber-500/10 border border-amber-600/30 p-2 rounded-xl text-[11px] text-amber-300 flex items-center gap-1.5 font-medium">
                    <Calendar size={13} className="text-amber-400" />
                    <span>Birthday {dUntil === 0 ? "today! 🎂" : `in ${dUntil} days!`}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between border-t border-stone-800/80 pt-2">
                  <button
                    onClick={() => onDeleteCustomer(c.id)}
                    className="p-2 rounded-xl bg-stone-800 hover:bg-rose-950 text-rose-400 text-xs transition"
                    title="Delete customer"
                  >
                    <Trash2 size={14} />
                  </button>

                  <button
                    onClick={() => onSelectCustomer(c)}
                    className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Eye size={14} /> View Profile
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination Load More Button */}
      {filtered.length > paginated.length && (
        <div className="flex justify-center pt-3">
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            className="px-5 py-2.5 rounded-xl bg-stone-900 border border-stone-800 hover:border-amber-500/50 text-stone-200 font-bold text-xs transition cursor-pointer"
          >
            Show More Customers ({filtered.length - paginated.length} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
