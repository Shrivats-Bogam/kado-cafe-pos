import { CATEGORIES } from "../data/menu.js";

export default function ParcelCategoryTabs({ activeCat, setActiveCat, hasQuery }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar items-center">
      {["All", ...CATEGORIES].map((c) => (
        <button
          key={c}
          onClick={() => setActiveCat(c)}
          className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-medium transition min-h-[44px] flex items-center justify-center ${
            activeCat === c && !hasQuery
              ? "bg-amber-500 text-stone-950 shadow-md font-semibold"
              : "bg-stone-900 text-stone-300 hover:bg-stone-800 border border-stone-800"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
