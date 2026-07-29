import { useState } from "react";
import { Plus, Phone, Trash2, X } from "lucide-react";
import { Card, Pill, IconButton, PrimaryButton } from "../components/ui.jsx";
import MenuPicker from "../components/MenuPicker.jsx";
import { PARCEL_STATUSES } from "../data/defaults.js";
import { currency, orderTotal } from "../lib/currency.js";

export default function ParcelView({ parcels, menuItems, onCreate, onUpdateStatus, onDelete }) {
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <PrimaryButton onClick={() => setShowNew(true)} className="self-start flex items-center gap-2">
        <Plus size={16} /> New Parcel
      </PrimaryButton>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {parcels.length === 0 && <p className="text-sm text-stone-500">No parcels yet.</p>}
        {[...parcels].reverse().map((p) => {
          const { grandTotal } = orderTotal(p.items, menuItems);
          const tone = p.status === "Cancelled" ? "rose" : p.status === "Delivered" ? "emerald" : "amber";
          return (
            <Card key={p.id} className="p-4 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-serif text-stone-50">{p.customerName || "Walk-in"}</p>
                  {p.phone && <p className="text-xs text-stone-500 flex items-center gap-1"><Phone size={11} /> {p.phone}</p>}
                </div>
                <Pill tone={tone}>{p.status}</Pill>
              </div>
              <ul className="text-sm text-stone-400 list-disc list-inside">
                {p.items.map((it) => {
                  const mi = menuItems.find((m) => m.id === it.menuItemId);
                  return <li key={it.menuItemId}>{mi?.name} ×{it.qty}</li>;
                })}
              </ul>
              <div className="flex justify-between text-sm text-stone-300">
                <span>{p.paymentMethod}</span><span>{currency(grandTotal)}</span>
              </div>
              {p.notes && <p className="text-xs text-stone-500 italic">{p.notes}</p>}
              <div className="flex gap-2 pt-1">
                <select
                  value={p.status}
                  onChange={(e) => onUpdateStatus(p.id, e.target.value)}
                  className="flex-1 rounded-lg bg-stone-800 border border-stone-700 text-xs px-2 py-1.5"
                >
                  {PARCEL_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <IconButton onClick={() => onDelete(p.id)}><Trash2 size={14} /></IconButton>
              </div>
            </Card>
          );
        })}
      </div>
      {showNew && (
        <NewParcelModal
          menuItems={menuItems}
          onClose={() => setShowNew(false)}
          onCreate={(p) => { onCreate(p); setShowNew(false); }}
        />
      )}
    </div>
  );
}

function NewParcelModal({ menuItems, onClose, onCreate }) {
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [notes, setNotes] = useState("");

  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 overflow-y-auto flex items-start sm:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <Card className="w-full sm:max-w-lg p-5 flex flex-col gap-3 my-4 sm:my-0">
        <div className="flex justify-between items-center">
          <h3 className="font-serif text-lg text-stone-50">New Parcel</h3>
          <IconButton onClick={onClose}><X size={16} /></IconButton>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" className="rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm" />
          <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Phone" className="rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm" />
        </div>

        <MenuPicker menuItems={menuItems} cart={cart} setCart={setCart} />
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" className="rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm" />

        <div>
          <p className="text-xs text-stone-500 mb-2">Payment method</p>
          <div className="grid grid-cols-3 gap-2">
            {["Cash", "UPI", "Card"].map((p) => (
              <button
                key={p}
                onClick={() => setPaymentMethod(p)}
                className={`rounded-lg py-2 text-xs font-medium border ${paymentMethod === p ? "bg-amber-500 text-stone-950 border-amber-500" : "bg-stone-800 text-stone-300 border-stone-700"}`}
              >{p}</button>
            ))}
          </div>
        </div>

        <PrimaryButton
          disabled={cart.length === 0}
          onClick={() => onCreate({
            id: "p" + Date.now(),
            customerName, phone,
            items: cart,
            status: "Preparing",
            paymentMethod, notes,
            createdAt: new Date().toISOString(),
          })}
        >Create Parcel</PrimaryButton>
      </Card>
    </div>
  );
}
