import { LayoutGrid, Map, Plus } from "lucide-react";
import { PrimaryButton } from "./ui.jsx";
import TableSearch from "./TableSearch.jsx";
import TableFilters from "./TableFilters.jsx";

export function TableToolbar({
  viewMode,
  setViewMode,
  searchQuery,
  setSearchQuery,
  activeFilter,
  setActiveFilter,
  counts,
  onAddTable,
}) {
  return (
    <div className="space-y-3 bg-stone-950/90 backdrop-blur-md pb-2 pt-1">
      {/* Top Row: View Mode Switcher, Search, Add Table */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-stone-900 border border-stone-800 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "grid"
                ? "bg-amber-500 text-stone-950 shadow-sm"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <LayoutGrid size={14} /> Grid View
          </button>

          <button
            onClick={() => setViewMode("floor")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "floor"
                ? "bg-amber-500 text-stone-950 shadow-sm"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <Map size={14} /> Floor Plan
          </button>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-0">
          <TableSearch searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        </div>

        {/* Add Table Primary Button */}
        <PrimaryButton
          onClick={onAddTable}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs shrink-0 shadow-md min-h-[44px]"
        >
          <Plus size={16} /> Add Table
        </PrimaryButton>
      </div>

      {/* Bottom Row: Status Filter Pills */}
      <TableFilters
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        counts={counts}
      />
    </div>
  );
}
