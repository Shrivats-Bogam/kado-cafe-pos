import { useState, useMemo } from "react";
import { Coffee, SearchX, RefreshCw } from "lucide-react";
import TableStats from "../components/TableStats.jsx";
import TableSearch from "../components/TableSearch.jsx";
import TableFilters from "../components/TableFilters.jsx";
import TableCard from "../components/TableCard.jsx";
import TableActionsMenu from "../components/TableActionsMenu.jsx";

export default function TablesView({
  tables = [],
  menuItems = [],
  onOpenTable,
  onSetStatus,
  onShowQR,
  onTransferTable,
  onMergeTable,
  onSplitTable,
  onReserveTable,
  onSetCleaning,
  onDuplicateOrder,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedTableForMenu, setSelectedTableForMenu] = useState(null);

  // Compute status counts for filter pills
  const counts = useMemo(() => {
    const map = {
      all: tables.length,
      available: 0,
      occupied: 0,
      preparing: 0,
      ready: 0,
      billing: 0,
      reserved: 0,
      cleaning: 0,
    };

    tables.forEach((t) => {
      if (t.status === "available") map.available++;
      if (t.status === "cleaning") map.cleaning++;
      if (t.status === "reserved" || t.isReserved) map.reserved++;
      if (t.status === "preparing" || t.status === "serving" || t.status === "ordering") map.preparing++;
      if (t.status === "ready" || t.kitchenStatus === "Ready") map.ready++;
      if (t.status === "billing" || t.status === "payment_pending") map.billing++;

      if (
        t.items.length > 0 ||
        ["preparing", "serving", "ordering", "ready", "billing", "payment_pending"].includes(t.status)
      ) {
        map.occupied++;
      }
    });

    return map;
  }, [tables]);

  // Filter tables based on search query and active filter
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const numMatch = `table ${t.number}`.includes(query) || `t-${t.number}`.includes(query) || `${t.number}` === query;
        const nameMatch = t.customerName && t.customerName.toLowerCase().includes(query);

        if (!numMatch && !nameMatch) return false;
      }

      // 2. Tab Filter
      if (activeFilter === "all") return true;
      if (activeFilter === "available") return t.status === "available";
      if (activeFilter === "occupied") {
        return (
          t.items.length > 0 ||
          ["preparing", "serving", "ordering", "ready", "billing", "payment_pending"].includes(t.status)
        );
      }
      if (activeFilter === "preparing") {
        return t.status === "preparing" || t.status === "serving" || t.status === "ordering";
      }
      if (activeFilter === "ready") return t.status === "ready" || t.kitchenStatus === "Ready";
      if (activeFilter === "billing") return t.status === "billing" || t.status === "payment_pending";
      if (activeFilter === "reserved") return t.status === "reserved" || Boolean(t.isReserved);
      if (activeFilter === "cleaning") return t.status === "cleaning";

      return true;
    });
  }, [tables, searchQuery, activeFilter]);

  return (
    <div className="flex flex-col gap-4 max-w-full">
      {/* Metrics Header */}
      <TableStats tables={tables} menuItems={menuItems} />

      {/* Search & Filters Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <TableSearch searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        <TableFilters
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          counts={counts}
        />
      </div>

      {/* Responsive Grid */}
      {filteredTables.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 mt-1">
          {filteredTables.map((t) => (
            <TableCard
              key={t.id}
              table={t}
              menuItems={menuItems}
              onOpenTable={onOpenTable}
              onOpenMoreMenu={(table) => setSelectedTableForMenu(table)}
            />
          ))}
        </div>
      ) : (
        /* Empty State UI */
        <div className="flex flex-col items-center justify-center p-12 bg-stone-900/60 border border-stone-800 rounded-3xl text-center my-6 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-stone-800/80 border border-stone-700/50 flex items-center justify-center text-amber-500 mb-4 shadow-inner">
            <SearchX size={32} />
          </div>
          <h3 className="font-serif text-xl font-bold text-stone-100 mb-1">No tables found</h3>
          <p className="text-sm text-stone-400 max-w-md mb-6 leading-relaxed">
            {searchQuery
              ? `No tables match "${searchQuery}" under the selected ${activeFilter} filter.`
              : `There are currently no tables matching the "${activeFilter}" status.`}
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setActiveFilter("all");
            }}
            className="min-h-[48px] px-5 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-sm font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-sm"
          >
            <RefreshCw size={16} className="text-amber-400" /> Reset Search & Filters
          </button>
        </div>
      )}

      {/* More Options Actions Modal */}
      {selectedTableForMenu && (
        <TableActionsMenu
          table={selectedTableForMenu}
          tables={tables}
          menuItems={menuItems}
          onClose={() => setSelectedTableForMenu(null)}
          onShowQR={onShowQR}
          onTransferTable={onTransferTable}
          onMergeTable={onMergeTable}
          onSplitTable={onSplitTable}
          onReserveTable={onReserveTable}
          onSetCleaning={onSetCleaning}
          onDuplicateOrder={onDuplicateOrder}
        />
      )}
    </div>
  );
}
