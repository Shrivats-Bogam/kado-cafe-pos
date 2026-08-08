import { useState, useMemo } from "react";
import { Search, Plus, Minus, Edit3, Sparkles } from "lucide-react";
import { Card, Pill, Modal, ModalHeader, PrimaryButton, TextInput } from "./ui.jsx";
import { currency } from "../lib/currency.js";

export function CustomerMenuPicker({ menuItems, cart, setCart, t }) {
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("All");
  const [editingItem, setEditingItem] = useState(null); // Item customization modal
  const [itemNotes, setItemNotes] = useState("");

  const categories = useMemo(() => {
    const cats = new Set(menuItems.map((m) => m.category || "General"));
    return ["All", ...Array.from(cats)];
  }, [menuItems]);

  const filtered = useMemo(() => {
    return menuItems.filter((m) => {
      if (m.available === false) return false;
      const matchCat = selectedCat === "All" || (m.category || "General") === selectedCat;
      const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [menuItems, selectedCat, search]);

  const getItemQty = (menuItemId) => {
    const found = cart.find((c) => c.menuItemId === menuItemId);
    return found ? found.qty : 0;
  };

  const handleUpdateQty = (menuItem, delta) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((c) => c.menuItemId === menuItem.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].qty + delta;
        if (newQty <= 0) {
          return updated.filter((c) => c.menuItemId !== menuItem.id);
        }
        updated[existingIndex] = { ...updated[existingIndex], qty: newQty };
        return updated;
      }
      if (delta > 0) {
        return [...prev, { menuItemId: menuItem.id, qty: 1, notes: "" }];
      }
      return prev;
    });
  };

  const handleSaveNotes = () => {
    if (!editingItem) return;
    setCart((prev) => {
      const existingIndex = prev.findIndex((c) => c.menuItemId === editingItem.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], notes: itemNotes };
        return updated;
      }
      return [...prev, { menuItemId: editingItem.id, qty: 1, notes: itemNotes }];
    });
    setEditingItem(null);
    setItemNotes("");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Categories */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <TextInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="pl-9 bg-stone-900 border-stone-800"
          />
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`shrink-0 min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedCat === cat
                  ? "bg-amber-500 text-stone-950 shadow-md"
                  : "bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-100"
              }`}
            >
              {cat === "All" ? t.allCategories : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Item Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((item) => {
          const qty = getItemQty(item.id);
          const cartEntry = cart.find((c) => c.menuItemId === item.id);

          return (
            <Card key={item.id} className="p-3.5 flex flex-col justify-between gap-3 bg-stone-900/90 border-stone-800 hover:border-stone-700 transition">
              <div className="flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-sm border shrink-0 flex items-center justify-center ${
                        item.isVeg ? "border-emerald-500" : "border-rose-500"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? "bg-emerald-500" : "bg-rose-500"}`} />
                    </span>
                    <h4 className="font-bold text-sm text-stone-100 leading-tight">{item.name}</h4>
                  </div>
                  <span className="font-serif font-bold text-sm text-amber-400 shrink-0">{currency(item.price)}</span>
                </div>
                {item.description && (
                  <p className="text-xs text-stone-400 line-clamp-2 mt-0.5">{item.description}</p>
                )}
                {cartEntry?.notes && (
                  <p className="text-[11px] text-amber-400/90 italic mt-1 flex items-center gap-1">
                    <Edit3 size={11} /> {cartEntry.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-800/60 mt-auto">
                <button
                  onClick={() => {
                    setEditingItem(item);
                    setItemNotes(cartEntry?.notes || "");
                  }}
                  className="text-xs text-stone-400 hover:text-amber-400 flex items-center gap-1 font-semibold"
                >
                  <Edit3 size={13} />
                  <span>{t.addNotes}</span>
                </button>

                <div className="flex items-center gap-2">
                  {qty > 0 ? (
                    <div className="flex items-center gap-2 bg-stone-950 border border-stone-800 rounded-xl p-1">
                      <button
                        onClick={() => handleUpdateQty(item, -1)}
                        className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-xs font-bold text-stone-100 px-1">{qty}</span>
                      <button
                        onClick={() => handleUpdateQty(item, 1)}
                        className="w-7 h-7 rounded-lg bg-amber-500 text-stone-950 font-bold flex items-center justify-center"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  ) : (
                    <PrimaryButton
                      onClick={() => handleUpdateQty(item, 1)}
                      className="py-1.5 px-3 min-h-[36px] text-xs"
                    >
                      <Plus size={14} /> Add
                    </PrimaryButton>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Item Customization Modal */}
      {editingItem && (
        <Modal onClose={() => setEditingItem(null)}>
          <ModalHeader title={`Customize ${editingItem.name}`} icon={Sparkles} onClose={() => setEditingItem(null)} />
          <div className="flex flex-col gap-3 mt-4">
            <label className="text-xs font-semibold text-stone-400">{t.itemNotes}</label>
            <TextInput
              value={itemNotes}
              onChange={(e) => setItemNotes(e.target.value)}
              placeholder={t.notesPlaceholder}
            />
            <div className="flex gap-2 justify-end mt-2">
              <button
                onClick={() => setEditingItem(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-stone-700 bg-stone-800 text-stone-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <PrimaryButton onClick={handleSaveNotes}>
                Save Instructions
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
