import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Card } from "./ui.jsx";
import { currency } from "../lib/currency.js";

export default function InventoryHistory({ inventoryLogs = [] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  const filteredLogs = useMemo(() => {
    return inventoryLogs.filter((log) => {
      // Type Filter
      if (typeFilter !== "All" && log.type !== typeFilter) return false;

      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchItem = (log.ingredientName || "").toLowerCase().includes(q);
        const matchSupplier = (log.supplier || "").toLowerCase().includes(q);
        const matchReason = (log.reason || "").toLowerCase().includes(q);
        const matchDate = (log.date || "").toLowerCase().includes(q);
        return matchItem || matchSupplier || matchReason || matchDate;
      }

      return true;
    }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [inventoryLogs, typeFilter, searchQuery]);

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-900 p-3 rounded-2xl border border-stone-800">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search log by product, supplier, invoice, or date..."
            className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-4 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
          {["All", "Purchase", "Sale", "Wastage", "Damage", "Staff", "Adjustment", "Warning"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition min-h-[44px] cursor-pointer ${
                typeFilter === t
                  ? "bg-amber-500 text-stone-950 shadow-md"
                  : "bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* History Log Cards / Table */}
      <Card className="p-4 bg-stone-900 border-stone-800 flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Inventory Transaction History Log</h3>

        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-stone-500 text-xs">
            No inventory transaction logs recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-stone-950 text-stone-400 font-semibold border-b border-stone-800">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3">Reason / Ref</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3 text-right">Cost Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {filteredLogs.map((log) => {
                  let badgeClass = "bg-stone-800 text-stone-300";
                  if (log.type === "Purchase") badgeClass = "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
                  else if (log.type === "Sale") badgeClass = "bg-sky-500/15 text-sky-400 border border-sky-500/30";
                  else if (log.type === "Wastage" || log.type === "Damage") badgeClass = "bg-rose-500/15 text-rose-400 border border-rose-500/30";
                  else if (log.type === "Staff") badgeClass = "bg-purple-500/15 text-purple-400 border border-purple-500/30";

                  return (
                    <tr key={log.id} className="hover:bg-stone-950/50 transition">
                      <td className="p-3 font-mono text-[11px] text-stone-400">
                        {new Date(log.date || Date.now()).toLocaleString()}
                      </td>
                      <td className="p-3 font-bold text-stone-100">{log.ingredientName}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${badgeClass}`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold">
                        <span className={log.qty > 0 ? "text-emerald-400" : "text-rose-400"}>
                          {log.qty > 0 ? `+${log.qty}` : log.qty} {log.unit}
                        </span>
                      </td>
                      <td className="p-3 text-stone-400">{log.reason || "-"}</td>
                      <td className="p-3 text-stone-400">{log.supplier || "-"}</td>
                      <td className="p-3 text-right font-mono font-bold text-amber-400">
                        {log.cost ? currency(log.cost) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
