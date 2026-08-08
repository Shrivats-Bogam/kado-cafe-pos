import { useState, useMemo, memo, useDeferredValue } from "react";
import { Search, Plus, Minus } from "lucide-react";
import { CATEGORIES as DEFAULT_CATEGORIES } from "../data/menu.js";
import { currency } from "../lib/currency.js";

const MenuItemCard = memo(function MenuItemCard({ item, qty, onAdd, onRemove }) {
  return (
    <div className="rounded-xl bg-stone-800/70 border border-stone-700 p-3 flex flex-col justify-between gap-2 shadow-xs">
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`w-2 h-2 rounded-full shrink-0 ${item.isVeg !== false ? "bg-emerald-500" : "bg-rose-500"}`} />
          <p className="text-xs font-bold text-stone-100 leading-tight truncate">{item.name}</p>
        </div>
        <p className="text-xs font-serif font-bold text-amber-400 font-mono">{currency(item.price)}</p>
      </div>

      {qty === 0 ? (
        <button
          type="button"
          onClick={() => onAdd(item.id)}
          className="rounded-lg bg-stone-700 hover:bg-amber-500 hover:text-stone-950 text-stone-200 text-xs font-bold py-1.5 flex items-center justify-center gap-1 transition cursor-pointer min-h-[36px]"
        >
          <Plus size={13} /> Add
        </button>
      ) : (
        <div className="flex items-center justify-between rounded-lg bg-stone-950 border border-stone-700 px-1 py-1 min-h-[36px]">
          <button type="button" onClick={() => onRemove(item.id)} className="p-1 text-stone-300 hover:text-white cursor-pointer">
            <Minus size={14} />
          </button>
          <span className="text-xs font-mono font-bold text-amber-400">{qty}</span>
          <button type="button" onClick={() => onAdd(item.id)} className="p-1 text-amber-400 hover:text-amber-300 cursor-pointer">
            <Plus size={14} />
          </button>
        </div>
      )}
    </div>
  );
});

export default function MenuPicker({ menuItems = [], categories = DEFAULT_CATEGORIES, cart = [], setCart }) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const deferredQuery = useDeferredValue(query);

  const activeCategories = useMemo(() => {
    return categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  }, [categories]);

  // Filter items: MUST be available (m.available !== false)
  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return menuItems.filter((m) => {
      // PART 6 & 19: Exclude unavailable items from ordering
      if (m.available === false) return false;
      if (!q && activeCat !== "All" && m.category !== activeCat) return false;
      if (q && !(m.name || "").toLowerCase().includes(q) && !(m.category || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [menuItems, deferredQuery, activeCat]);

  // O(1) qty lookup per card per render
  const cartMap = useMemo(() => {
    const map = {};
    cart.forEach((c) => { map[c.menuItemId] = c.qty; });
    return map;
  }, [cart]);

  const addItem = (id) => {
    const item = menuItems.find((m) => m.id === id);
    if (!item || item.available === false) return;

    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === id);
      if (existing) return prev.map((c) => (c.menuItemId === id ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { menuItemId: id, qty: 1 }];
    });
  };

  const removeItem = (id) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === id);
      if (!existing) return prev;
      if (existing.qty <= 1) return prev.filter((c) => c.menuItemId !== id);
      return prev.map((c) => (c.menuItemId === id ? { ...c, qty: c.qty - 1 } : c));
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Instant Search Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search available menu items..."
          className="w-full rounded-xl bg-stone-950 border border-stone-800 pl-9 pr-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 min-h-[44px]"
        />
      </div>

      {/* Category Chips Scrollbar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {["All", ...activeCategories].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setActiveCat(c)}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold border transition cursor-pointer min-h-[36px] ${
              activeCat === c
                ? "bg-amber-500 text-stone-950 border-amber-400 shadow-md"
                : "bg-stone-950 text-stone-400 border-stone-800 hover:text-stone-200 hover:bg-stone-800"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Menu Item Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[440px] overflow-y-auto pr-1">
        {filtered.map((m) => (
          <MenuItemCard key={m.id} item={m} qty={cartMap[m.id] || 0} onAdd={addItem} onRemove={removeItem} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-xs text-stone-500 py-8 text-center bg-stone-950/40 rounded-xl border border-stone-800/60">
            No available items match your search.
          </p>
        )}
      </div>
    </div>
  );
}
