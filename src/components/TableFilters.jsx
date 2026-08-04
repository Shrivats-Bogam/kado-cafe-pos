export default function TableFilters({ activeFilter, setActiveFilter, counts }) {
  const filters = [
    { id: "all", label: "All" },
    { id: "available", label: "Available" },
    { id: "occupied", label: "Occupied" },
    { id: "preparing", label: "Preparing" },
    { id: "ready", label: "Ready" },
    { id: "billing", label: "Billing" },
    { id: "reserved", label: "Reserved" },
    { id: "cleaning", label: "Cleaning" },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 scroll-smooth">
      {filters.map((f) => {
        const isActive = activeFilter === f.id;
        const count = counts[f.id] || 0;

        return (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`min-h-[48px] px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-2 border shrink-0 ${
              isActive
                ? "bg-amber-500 text-stone-950 border-amber-400 shadow-sm"
                : "bg-stone-900/90 text-stone-300 border-stone-800 hover:bg-stone-800 hover:text-stone-100"
            }`}
          >
            <span>{f.label}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isActive
                  ? "bg-stone-950/20 text-stone-950"
                  : "bg-stone-800 text-stone-400 border border-stone-700/50"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
