import { useState, useMemo, memo, useDeferredValue } from "react";
import { Search, Plus, Minus } from "lucide-react";
import { CATEGORIES } from "../../data/menu.js";
import { currency } from "../../lib/currency.js";

const MenuItemCard = memo(function MenuItemCard({ item, qty, onAdd, onRemove }) {
  return (
    <div className="rounded-xl bg-stone-800/70 border border-stone-700 p-3 flex flex-col gap-2">
      <div>
        <p className="text-sm font-medium text-stone-100 leading-tight">{item.name}</p>
        <p className="text-xs text-stone-400">{currency(item.price)}</p>
      </div>
      {qty === 0 ? (
        <button
          onClick={() => onAdd(item.id)}
          className="rounded-lg bg-stone-700 hover:bg-amber-500 hover:text-stone-950 text-stone-200 text-xs font-medium py-1.5 flex items-center justify-center gap-1"
        >
          <Plus size={13} /> Add
        </button>
      ) : (
        <div className="flex items-center justify-between rounded-lg bg-stone-700 px-1 py-1">
          <button onClick={() => onRemove(item.id)} className="p-1"><Minus size={14} /></button>
          <span className="text-sm font-semibold">{qty}</span>
          <button onClick={() => onAdd(item.id)} className="p-1"><Plus size={14} /></button>
        </div>
      )}
    </div>
  );
});

export default function MenuPicker({ menuItems, cart, setCart }) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  // Defer the filter pass so typing stays instant even on a big menu.
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return menuItems.filter((m) => {
      if (!m.available) return false;
      if (!q && activeCat !== "All" && m.category !== activeCat) return false;
      if (q && !m.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [menuItems, deferredQuery, activeCat]);

  // O(1) qty lookup per card per render.
  const cartMap = useMemo(() => {
    const map = {};
    cart.forEach((c) => { map[c.menuItemId] = c.qty; });
    return map;
  }, [cart]);

  const addItem = (id) => {
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
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search menu..."
          className="w-full rounded-xl bg-stone-800 border border-stone-700 pl-9 pr-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {["All", ...CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setActiveCat(c)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border ${
              activeCat === c
                ? "bg-amber-500 text-stone-950 border-amber-500"
                : "bg-stone-800 text-stone-300 border-stone-700"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {filtered.map((m) => (
          <MenuItemCard key={m.id} item={m} qty={cartMap[m.id] || 0} onAdd={addItem} onRemove={removeItem} />
        ))}
        {filtered.length === 0 && <p className="col-span-full text-sm text-stone-500 py-6 text-center">No items match.</p>}
      </div>
    </div>
  );
}
