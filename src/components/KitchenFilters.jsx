import { Search, Monitor, Smartphone, ListFilter, Zap } from "lucide-react";

export default function KitchenFilters({ 
  searchQuery, 
  setSearchQuery, 
  filter, 
  setFilter, 
  displayMode, 
  setDisplayMode 
}) {
  const FILTERS = ["All", "New", "Cooking", "Ready", "Rush", "Table", "Parcel"];

  return (
    <div className="bg-stone-900 border-b border-stone-800 px-4 py-3 sticky top-0 z-20 shadow-sm flex flex-col md:flex-row md:items-center gap-3">
      {/* Search Bar */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
        <input
          type="text"
          placeholder="Search by table, parcel, customer, or ticket..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-stone-950 border border-stone-800 text-stone-200 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 min-h-[44px]"
        />
      </div>

      {/* Filter Chips */}
      <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <ListFilter size={16} className="text-stone-600 shrink-0 mr-1 hidden sm:block" />
        {FILTERS.map((f) => {
          const isSelected = filter === f;
          const isRushFilter = f === "Rush";

          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 min-h-[44px] cursor-pointer ${
                isSelected
                  ? isRushFilter
                    ? "bg-purple-600 text-white shadow-md"
                    : "bg-amber-500 text-stone-950 shadow-md"
                  : "bg-stone-950 border border-stone-800 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
              }`}
            >
              {isRushFilter && <Zap size={12} />}
              {f}
            </button>
          );
        })}
      </div>

      {/* KDS Display Mode Toggle */}
      <div className="flex items-center gap-1 bg-stone-950 rounded-xl p-1 shrink-0 border border-stone-800 min-h-[44px]">
        <button
          onClick={() => setDisplayMode("normal")}
          className={`p-2 rounded-lg transition flex items-center justify-center cursor-pointer ${
            displayMode === "normal" ? "bg-stone-800 text-amber-400 font-bold shadow-sm" : "text-stone-500 hover:text-stone-300"
          }`}
          title="Standard Compact Grid"
        >
          <Smartphone size={16} />
        </button>
        <button
          onClick={() => setDisplayMode("large")}
          className={`p-2 rounded-lg transition flex items-center justify-center cursor-pointer ${
            displayMode === "large" ? "bg-stone-800 text-amber-400 font-bold shadow-sm" : "text-stone-500 hover:text-stone-300"
          }`}
          title="KDS Large TV / Monitor Mode"
        >
          <Monitor size={16} />
        </button>
      </div>
    </div>
  );
}
