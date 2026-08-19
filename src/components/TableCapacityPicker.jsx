import { Users } from "lucide-react";

export function TableCapacityPicker({ value = 4, onChange }) {
  const capacities = [1, 2, 3, 4, 5, 6, 8, 10, 12];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-stone-300 flex items-center gap-1.5">
          <Users size={14} className="text-amber-400" /> Guest Seating Capacity
        </label>
        <input
          type="number"
          min="1"
          max="50"
          data-testid="table-capacity-input"
          value={value}
          onChange={(e) => onChange(Math.max(1, Number(e.target.value)))}
          className="w-20 min-h-[36px] rounded-lg bg-stone-800 border border-stone-700 px-2.5 text-xs text-stone-100 font-bold text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>
      <div className="grid grid-cols-5 sm:grid-cols-9 gap-1.5">
        {capacities.map((cap) => {
          const isSelected = Number(value) === cap;
          return (
            <button
              key={cap}
              type="button"
              onClick={() => onChange(cap)}
              className={`min-h-[44px] py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center justify-center ${
                isSelected
                  ? "bg-amber-500 text-stone-950 border-amber-400 shadow-md scale-105"
                  : "bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700 hover:text-stone-100"
              }`}
            >
              {cap}
            </button>
          );
        })}
      </div>
    </div>
  );
}
