import { useState, useMemo } from "react";
import { Plus, Phone, Trash2, Edit, Search, Clock, CheckCircle2, PackageCheck } from "lucide-react";
import { Card, Pill, IconButton, PrimaryButton } from "../components/ui.jsx";
import { ParcelOrderScreen } from "../components/parcel/index.js";
import { PARCEL_STATUSES } from "../data/defaults.js";
import { currency, orderTotal } from "../lib/currency.js";

export default function ParcelView({ parcels = [], menuItems = [], customers = [], onCreate, onUpdateStatus, onDelete }) {
  const [activeParcel, setActiveParcel] = useState(null); // null = list view, "new" = create screen, object = edit screen
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filteredParcels = useMemo(() => {
    return [...parcels].reverse().filter((p) => {
      if (statusFilter !== "All" && p.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.customerName?.toLowerCase().includes(q);
        const matchPhone = p.phone?.includes(q);
        const matchId = p.id?.toLowerCase().includes(q);
        return matchName || matchPhone || matchId;
      }
      return true;
    });
  }, [parcels, statusFilter, searchQuery]);

  const handleSaveParcel = (parcelData) => {
    onCreate(parcelData);
    setActiveParcel(null);
  };

  if (activeParcel) {
    return (
      <ParcelOrderScreen
        menuItems={menuItems}
        customers={customers}
        initialParcel={typeof activeParcel === "object" ? activeParcel : null}
        onClose={() => setActiveParcel(null)}
        onSave={handleSaveParcel}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-6xl mx-auto pb-10">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900 border border-stone-800 p-4 rounded-2xl">
        <div>
          <h2 className="font-serif text-xl text-stone-50 flex items-center gap-2">
            <PackageCheck className="text-amber-500" size={24} /> Takeaway Orders
          </h2>
          <p className="text-xs text-stone-400">Manage customer takeaway orders & real-time statuses</p>
        </div>
        <PrimaryButton 
          onClick={() => setActiveParcel("new")} 
          className="flex items-center justify-center gap-2 text-sm py-3 px-5 rounded-xl font-bold min-h-[48px]"
        >
          <Plus size={18} /> New Parcel Order
        </PrimaryButton>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, phone, or order ID..."
            className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500 min-h-[44px]"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 no-scrollbar">
          {["All", ...PARCEL_STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition min-h-[38px] ${
                statusFilter === s
                  ? "bg-amber-500 text-stone-950 shadow-sm"
                  : "bg-stone-900 text-stone-400 hover:bg-stone-800 border border-stone-800"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Parcels Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredParcels.length === 0 && (
          <div className="col-span-full py-16 text-center text-stone-500 bg-stone-900/30 rounded-2xl border border-stone-800/60 flex flex-col items-center">
            <PackageCheck size={40} className="mb-3 opacity-20" />
            <p className="text-base font-medium">No takeaway orders found.</p>
            <p className="text-xs text-stone-600 mt-1">Tap "New Parcel Order" to start a new takeaway.</p>
          </div>
        )}

        {filteredParcels.map((p) => {
          const { grandTotal } = orderTotal(p.items, menuItems);
          const tone = p.status === "Cancelled" ? "rose" : p.status === "Delivered" ? "emerald" : "amber";
          const isPaid = p.paymentStatus === "Paid" || p.isPaid;

          return (
            <Card key={p.id} className="p-4 flex flex-col justify-between gap-3 bg-stone-900 border-stone-800 hover:border-stone-700 transition">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-semibold text-stone-100 text-base">{p.customerName || "Walk-in Customer"}</h3>
                    {p.phone && (
                      <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
                        <Phone size={12} className="text-amber-500" /> {p.phone}
                      </p>
                    )}
                  </div>
                  <Pill tone={tone}>{p.status}</Pill>
                </div>

                {/* Items Summary */}
                <div className="bg-stone-950/60 rounded-xl p-3 border border-stone-800/80 my-1">
                  <ul className="text-xs text-stone-300 flex flex-col gap-1">
                    {p.items.map((it) => {
                      const mi = menuItems.find((m) => m.id === it.menuItemId);
                      return (
                        <li key={it.menuItemId} className="flex justify-between items-center">
                          <span>{mi?.name || "Item"} <strong className="text-amber-400">×{it.qty}</strong></span>
                          {it.notes && <span className="text-[10px] text-stone-500 italic">({it.notes})</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Payment & Total info */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-800">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                      isPaid 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}>
                      {isPaid ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                      {isPaid ? `Paid (${p.paymentMethod || "Cash"})` : "Unpaid"}
                    </span>
                  </div>
                  <span className="text-base font-bold text-amber-500">{currency(grandTotal)}</span>
                </div>

                {p.notes && <p className="text-xs text-stone-500 italic bg-stone-950 px-2.5 py-1.5 rounded-lg">Note: {p.notes}</p>}
              </div>

              {/* Status Update & Actions Bar */}
              <div className="flex items-center gap-2 pt-2 border-t border-stone-800/80">
                <select
                  value={p.status}
                  onChange={(e) => onUpdateStatus(p.id, e.target.value)}
                  className="flex-1 rounded-xl bg-stone-800 border border-stone-700 text-xs px-3 py-2 text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500 min-h-[38px]"
                >
                  {PARCEL_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <IconButton 
                  onClick={() => setActiveParcel(p)}
                  className="bg-stone-800 hover:bg-stone-700 text-stone-300 p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl"
                  title="Edit Order"
                >
                  <Edit size={15} />
                </IconButton>

                <IconButton 
                  onClick={() => onDelete(p.id)}
                  className="bg-stone-800 hover:bg-rose-900/40 text-stone-400 hover:text-rose-400 p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl transition"
                  title="Delete Order"
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
