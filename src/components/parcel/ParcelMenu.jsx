import { useState, useDeferredValue, useMemo, memo } from "react";
import { Search, Plus, Minus } from "lucide-react";
import ParcelCategoryTabs from "./ParcelCategoryTabs.jsx";
import { currency } from "../../lib/currency.js";

const MenuItemCard = memo(function MenuItemCard({ item, qty, onAdd, onRemove }) {
  return (
    <div 
      onClick={() => qty === 0 && onAdd(item.id)}
      className={`rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition border ${
        qty > 0 
          ? "bg-amber-500/10 border-amber-500/50 shadow-sm" 
          : "bg-stone-900 border-stone-800 hover:border-stone-700"
      }`}
      style={{ minHeight: "130px" }}
    >
      <div>
        <h4 className="font-semibold text-stone-100 mb-1 leading-snug">{item.name}</h4>
        <p className="text-sm font-medium text-amber-500/90">{currency(item.price)}</p>
      </div>

      <div onClick={(e) => e.stopPropagation()} className="mt-3">
        {qty === 0 ? (
          <button
            onClick={() => onAdd(item.id)}
            className="w-full rounded-xl bg-stone-800 hover:bg-stone-700 active:bg-amber-500 active:text-stone-950 text-stone-200 text-sm font-medium min-h-[44px] flex items-center justify-center gap-1.5 transition"
          >
            <Plus size={18} /> Add
          </button>
        ) : (
          <div className="flex items-center justify-between rounded-xl bg-amber-500 text-stone-950 p-1 min-h-[44px]">
            <button 
              onClick={() => onRemove(item.id)} 
              className="w-10 h-10 flex items-center justify-center hover:bg-black/10 active:bg-black/20 rounded-lg transition"
              aria-label="Decrease quantity"
            >
              <Minus size={18} />
            </button>
            <span className="text-base font-bold px-2">{qty}</span>
            <button 
              onClick={() => onAdd(item.id)} 
              className="w-10 h-10 flex items-center justify-center hover:bg-black/10 active:bg-black/20 rounded-lg transition"
              aria-label="Increase quantity"
            >
              <Plus size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default function ParcelMenu({ menuItems, cart, setCart }) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("All");
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

  const cartMap = useMemo(() => {
    const map = {};
    cart.forEach((c) => { map[c.menuItemId] = c.qty; });
    return map;
  }, [cart]);

  const addItem = (id) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === id);
      if (existing) return prev.map((c) => (c.menuItemId === id ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { menuItemId: id, qty: 1, notes: "" }];
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
    <div className="flex flex-col gap-4">
      {/* Search Bar */}
      <div className="relative">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search menu items..."
          className="w-full rounded-2xl bg-stone-900 border border-stone-800 pl-11 pr-4 py-3.5 text-base text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition min-h-[48px]"
        />
        {query && (
          <button 
            onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-stone-400 bg-stone-800 px-2 py-1 rounded-md"
          >
            Clear
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <ParcelCategoryTabs 
        activeCat={activeCat} 
        setActiveCat={(cat) => { setActiveCat(cat); setQuery(""); }} 
        hasQuery={Boolean(query)}
      />

      {/* Menu Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((m) => (
          <MenuItemCard 
            key={m.id} 
            item={m} 
            qty={cartMap[m.id] || 0} 
            onAdd={addItem} 
            onRemove={removeItem} 
          />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-stone-500 bg-stone-900/40 rounded-2xl border border-stone-800/50">
            <Search size={36} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No items found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
