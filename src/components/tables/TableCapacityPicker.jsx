import { Users } from "lucide-react";

export function TableCapacityPicker({ value = 4, onChange }) {
  const options = [1, 2, 3, 4, 5, 6, 8, 10, 12];

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-stone-300 flex items-center gap-1.5">
        <Users size={14} className="text-amber-400" /> Table Capacity (Guests)
      </label>
      
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const isSelected = Number(value) === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center border cursor-pointer ${
                isSelected
                  ? "bg-amber-500 border-amber-400 text-stone-950 shadow-md scale-105"
                  : "bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-750 hover:text-stone-100"
              }`}
            >
              {opt} {opt === 1 ? "Guest" : "Guests"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
