import { useState } from "react";
import { Plus, Check, X, Trash2 } from "lucide-react";
import { Card, IconButton, PrimaryButton } from "../components/ui.jsx";
import { CATEGORIES } from "../data/menu.js";
import { currency } from "../lib/currency.js";

export default function MenuManageView({ menuItems, onAdd, onEdit, onDelete }) {
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <PrimaryButton onClick={() => setShowNew(true)} className="self-start flex items-center gap-2">
        <Plus size={16} /> Add Item
      </PrimaryButton>

      {CATEGORIES.map((cat) => {
        const items = menuItems.filter((m) => m.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat}>
            <h4 className="text-xs uppercase tracking-wide text-stone-500 mb-2">{cat}</h4>
            <div className="flex flex-col gap-2">
              {items.map((m) => (
                <Card key={m.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${m.available ? "text-stone-100" : "text-stone-600 line-through"}`}>{m.name}</p>
                    <p className="text-xs text-stone-500">{currency(m.price)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconButton onClick={() => onEdit(m.id, { available: !m.available })}>
                      {m.available ? <Check size={14} /> : <X size={14} />}
                    </IconButton>
                    <IconButton onClick={() => onDelete(m.id)}><Trash2 size={14} /></IconButton>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {showNew && (
        <NewMenuItemModal
          onClose={() => setShowNew(false)}
          onAdd={(item) => { onAdd(item); setShowNew(false); }}
        />
      )}
    </div>
  );
}

function NewMenuItemModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [price, setPrice] = useState("");

  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <Card className="w-full sm:max-w-sm p-5 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h3 className="font-serif text-lg text-stone-50">New Menu Item</h3>
          <IconButton onClick={onClose}><X size={16} /></IconButton>
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" className="rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm">
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" type="number" className="rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm" />
        <PrimaryButton
          disabled={!name || !price}
          onClick={() => onAdd({
            id: "m" + Date.now(),
            name,
            category,
            price: Number(price) || 0,
            available: true,
          })}
        >Add Item</PrimaryButton>
      </Card>
    </div>
  );
}
