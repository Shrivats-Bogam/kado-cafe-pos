import { Search, Monitor, Smartphone, ListFilter } from "lucide-react";

export default function KitchenFilters({ 
  searchQuery, 
  setSearchQuery, 
  filter, 
  setFilter, 
  displayMode, 
  setDisplayMode 
}) {
  const FILTERS = ["All", "Preparing", "Ready", "Parcel", "Dine In", "Urgent"];

  return (
    <div className="bg-stone-900 border-b border-stone-800 px-4 py-3 sticky top-0 z-20 shadow-sm flex flex-col md:flex-row md:items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
        <input
          type="text"
          placeholder="Search table, parcel, or customer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-stone-950 border border-stone-800 text-stone-200 text-sm rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
        />
      </div>

      {/* Filter Chips */}
      <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <ListFilter size={16} className="text-stone-600 shrink-0 mr-1 hidden sm:block" />
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === f 
                ? "bg-amber-500 text-stone-950" 
                : "bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Display Mode Toggle */}
      <div className="flex items-center gap-1 bg-stone-950 rounded-xl p-1 shrink-0 border border-stone-800">
        <button
          onClick={() => setDisplayMode("normal")}
          className={`p-1.5 rounded-lg transition flex items-center justify-center ${
            displayMode === "normal" ? "bg-stone-800 text-amber-500 shadow-sm" : "text-stone-500 hover:text-stone-300"
          }`}
          title="Normal Mode"
        >
          <Smartphone size={16} />
        </button>
        <button
          onClick={() => setDisplayMode("large")}
          className={`p-1.5 rounded-lg transition flex items-center justify-center ${
            displayMode === "large" ? "bg-stone-800 text-amber-500 shadow-sm" : "text-stone-500 hover:text-stone-300"
          }`}
          title="KDS Mode"
        >
          <Monitor size={16} />
        </button>
      </div>
    </div>
  );
}
