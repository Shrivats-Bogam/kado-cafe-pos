import { useState } from "react";
import { Search, Plus, Phone, Trash2, X } from "lucide-react";
import { Card, Pill, IconButton, PrimaryButton } from "../components/ui.jsx";
import { currency as _currency } from "../lib/currency.js";
import { daysUntilBirthday, favoriteItem } from "../lib/loyalty.js";

export default function CustomersView({ customers, orderHistory, menuItems, onAdd, onDelete }) {
  const [showNew, setShowNew] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = customers.filter(
    (c) => !query ||
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      (c.phone || "").includes(query)
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or phone..."
            className="w-full rounded-xl bg-stone-800 border border-stone-700 pl-9 pr-3 py-2 text-sm text-stone-100 placeholder-stone-500"
          />
        </div>
        <PrimaryButton onClick={() => setShowNew(true)} className="flex items-center gap-1 shrink-0">
          <Plus size={16} /> Add
        </PrimaryButton>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.length === 0 && (
          <p className="text-sm text-stone-500">
            No customers yet — added automatically when a phone number is entered at billing, or add one manually.
          </p>
        )}
        {filtered.map((c) => {
          const dUntil = daysUntilBirthday(c.birthday);
          const fav = favoriteItem(c.id, orderHistory, menuItems);
          return (
            <Card key={c.id} className="p-4 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-serif text-stone-50">{c.name}</p>
                  <p className="text-xs text-stone-500 flex items-center gap-1"><Phone size={11} /> {c.phone}</p>
                </div>
                <Pill tone="amber">{c.points || 0} pts</Pill>
              </div>
              <div className="text-xs text-stone-400 flex flex-col gap-0.5">
                <span>
                  {c.totalOrders || 0} order{(c.totalOrders || 0) !== 1 ? "s" : ""} · last visit{" "}
                  {c.lastVisit ? new Date(c.lastVisit).toLocaleDateString() : "—"}
                </span>
                {fav && <span>Favorite: {fav}</span>}
                {dUntil !== null && dUntil <= 7 && (
                  <span className="text-amber-400">
                    🎂 Birthday in {dUntil === 0 ? "today!" : `${dUntil}d`}
                  </span>
                )}
              </div>
              <div className="flex justify-end">
                <IconButton onClick={() => onDelete(c.id)}><Trash2 size={14} /></IconButton>
              </div>
            </Card>
          );
        })}
      </div>

      {showNew && (
        <NewCustomerModal
          onClose={() => setShowNew(false)}
          onCreate={(c) => { onAdd(c); setShowNew(false); }}
        />
      )}
    </div>
  );
}

function NewCustomerModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");

  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 overflow-y-auto flex items-start sm:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <Card className="w-full sm:max-w-sm p-5 flex flex-col gap-3 my-4 sm:my-0">
        <div className="flex justify-between items-center">
          <h3 className="font-serif text-lg text-stone-50">New Customer</h3>
          <IconButton onClick={onClose}><X size={16} /></IconButton>
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm" />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="Phone"
          className="rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm"
        />
        <div>
          <p className="text-xs text-stone-500 mb-1">Birthday (optional)</p>
          <input
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            type="date"
            className="w-full rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm"
          />
        </div>
        <PrimaryButton
          disabled={!name || phone.length < 6}
          onClick={() => onCreate({
            id: "c" + Date.now(),
            name, phone, birthday,
            totalOrders: 0,
            points: 0,
            lastVisit: null,
          })}
        >Add Customer</PrimaryButton>
      </Card>
    </div>
  );
}
