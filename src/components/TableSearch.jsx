import { Search, X } from "lucide-react";

export default function TableSearch({ searchQuery, setSearchQuery }) {
  return (
    <div className="relative flex-1 min-w-[220px]">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
        <Search size={18} />
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search table number or customer name..."
        className="w-full min-h-[48px] pl-10 pr-10 rounded-2xl bg-stone-900 border border-stone-800 text-stone-100 placeholder-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all duration-200"
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery("")}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-200 transition-colors"
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
