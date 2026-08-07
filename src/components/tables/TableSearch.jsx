import { Search, X } from "lucide-react";

export default function TableSearch({ searchQuery = "", setSearchQuery }) {
  return (
    <div className="relative w-full">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search by table, customer, phone or bill..."
        className="w-full rounded-xl bg-stone-900 border border-stone-800 pl-10 pr-9 py-2.5 text-xs text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors shadow-inner min-h-[44px]"
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 p-1 rounded-full cursor-pointer"
          aria-label="Clear table search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
