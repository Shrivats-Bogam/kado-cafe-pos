import { Users } from "lucide-react";

export function TableCapacityPicker({ value = 4, onChange }) {
  const capacities = [1, 2, 3, 4, 5, 6, 8, 10, 12];

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-stone-300 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Users size={14} className="text-amber-400" /> Guest Seating Capacity
        </span>
        <span className="text-xs text-amber-400 font-extrabold bg-stone-800 px-2 py-0.5 rounded border border-stone-700">
          👥 {value} Guests
        </span>
      </label>
      <div className="grid grid-cols-5 sm:grid-cols-9 gap-1.5">
        {capacities.map((cap) => {
          const isSelected = Number(value) === cap;
          return (
            <button
              key={cap}
              type="button"
              onClick={() => onChange(cap)}
              className={`min-h-[44px] py-2 rounded-xl text-xs font-bold transition-all border flex flex-col items-center justify-center cursor-pointer ${
                isSelected
                  ? "bg-amber-500 text-stone-950 border-amber-400 shadow-md scale-105"
                  : "bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700 hover:text-white"
              }`}
            >
              <span>{cap}</span>
              <span className="text-[9px] opacity-75">guest{cap > 1 ? "s" : ""}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
