import { useState, useRef, useEffect } from "react";
import { ChevronDown, Sparkles, Zap, ChefHat, CheckCircle2 } from "lucide-react";

export default function TableFilters({ activeFilter = "all", setActiveFilter, counts = {} }) {
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowMoreDropdown(false);
      }
    };
    if (showMoreDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMoreDropdown]);

  const primaryFilters = [
    { id: "all", label: "All", count: counts.all },
    { id: "available", label: "🟢 Available", count: counts.available },
    { id: "occupied", label: "🟠 Occupied", count: counts.occupied },
    { id: "preparing", label: "🟣 Kitchen", count: counts.preparing },
    { id: "reserved", label: "🟡 Reserved", count: counts.reserved },
  ];

  const moreFilters = [
    { id: "cleaning", label: "⚫ Cleaning Mode", icon: Sparkles, count: counts.cleaning },
    { id: "rush", label: "⚡ Rush Orders", icon: Zap, count: counts.rush },
    { id: "preparing", label: "🟣 Waiting Kitchen", icon: ChefHat, count: counts.preparing },
    { id: "ready", label: "🔵 Food Ready to Serve", icon: CheckCircle2, count: counts.ready },
  ];

  const isMoreActive = ["cleaning", "rush", "ready"].includes(activeFilter);

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
      <span className="text-stone-500 font-semibold mr-1 text-[11px] shrink-0">Filter:</span>
      
      {/* Primary Filter Pills */}
      {primaryFilters.map((pill) => {
        const isActive = activeFilter === pill.id;
        const count = pill.count !== undefined ? pill.count : 0;

        return (
          <button
            key={pill.id}
            onClick={() => setActiveFilter(pill.id)}
            className={`px-3.5 py-1.5 rounded-full font-bold transition-all shrink-0 border flex items-center gap-1.5 cursor-pointer ${
              isActive
                ? "bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-xs scale-105"
                : "bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700"
            }`}
          >
            <span>{pill.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                isActive
                  ? "bg-amber-400 text-stone-950"
                  : "bg-stone-800 text-stone-400"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}

      {/* More Dropdown Pill */}
      <div ref={dropdownRef} className="relative shrink-0">
        <button
          onClick={() => setShowMoreDropdown((prev) => !prev)}
          className={`px-3.5 py-1.5 rounded-full font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
            isMoreActive
              ? "bg-amber-500/20 border-amber-500/60 text-amber-300"
              : "bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200"
          }`}
        >
          <span>More</span>
          <ChevronDown size={14} className={`transition-transform ${showMoreDropdown ? "rotate-180" : ""}`} />
        </button>

        {showMoreDropdown && (
          <div className="absolute left-0 mt-2 w-52 rounded-xl bg-stone-900 border border-stone-800 shadow-2xl p-1.5 z-50 animate-in fade-in duration-150">
            {moreFilters.map((mf) => {
              const Icon = mf.icon;
              const isSelected = activeFilter === mf.id;

              return (
                <button
                  key={mf.id}
                  onClick={() => {
                    setActiveFilter(mf.id);
                    setShowMoreDropdown(false);
                  }}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-amber-500/20 text-amber-300 font-bold"
                      : "text-stone-300 hover:bg-stone-800 hover:text-stone-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={14} className="text-amber-400 shrink-0" />
                    <span>{mf.label}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-800 text-stone-400 font-bold">
                    {mf.count || 0}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
