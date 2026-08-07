import { useState, useMemo } from "react";
import { 
  X, Phone, Calendar, Award, Star, ShoppingBag, 
  RotateCcw, Edit2, Trash2, Save, Sparkles, Receipt, StickyNote, CheckCircle2
} from "lucide-react";
import { Card, Pill, PrimaryButton, IconButton } from "../ui/index.js";
import { currency } from "../../lib/currency.js";
import { daysUntilBirthday } from "../../lib/loyalty.js";
import { getCustomerTier, formatRelativeDate } from "./CustomerCard.jsx";
import { indexById } from "../../lib/menuIndex.js";

function ConfirmDialog({ title, message, confirmLabel = "Confirm", onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <Card className="w-full max-w-sm p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-base text-stone-100">{title}</h3>
        <p className="text-xs text-stone-400">{message}</p>
        <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </Card>
    </div>
  );
}

export function CustomerProfileDrawer({
  customer,
  orderHistory = [],
  menuItems = [],
  onClose,
  onEdit,
  onDelete,
  onUpdateNotes,
}) {
  const [notes, setNotes] = useState(customer?.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Calculate customer order history & metrics
  const customerOrders = useMemo(() => {
    if (!customer) return [];
    return orderHistory
      .filter((o) => o.customerId === customer.id || (customer.phone && o.phone === customer.phone))
      .sort((a, b) => new Date(b.timestamp || b.id) - new Date(a.timestamp || a.id));
  }, [customer, orderHistory]);

  const lifetimeSpend = useMemo(() => {
    return customerOrders.reduce((sum, o) => sum + (o.grandTotal || o.total || 0), 0);
  }, [customerOrders]);

  const tier = getCustomerTier(lifetimeSpend, customer?.points || 0);
  const bdayDays = daysUntilBirthday(customer?.birthday);

  // Top 5 Favorite Items
  const favoriteItems = useMemo(() => {
    const idx = indexById(menuItems);
    const counts = {};
    customerOrders.forEach((o) => {
      (o.items || []).forEach((it) => {
        const mi = idx.get(it.menuItemId);
        const name = mi ? mi.name : (it.name || it.menuItemId);
        counts[name] = (counts[name] || 0) + (it.qty || 1);
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [customerOrders, menuItems]);

  // Next Tier Progress calculation
  const nextTier = useMemo(() => {
    if (tier.name === "Bronze") return { target: 1000, name: "Silver", needed: Math.max(0, 1000 - lifetimeSpend) };
    if (tier.name === "Silver") return { target: 5000, name: "Gold", needed: Math.max(0, 5000 - lifetimeSpend) };
    if (tier.name === "Gold") return { target: 15000, name: "Platinum", needed: Math.max(0, 15000 - lifetimeSpend) };
    return null;
  }, [tier, lifetimeSpend]);

  const tierProgress = useMemo(() => {
    if (!nextTier) return 100;
    const base = tier.name === "Bronze" ? 0 : tier.name === "Silver" ? 1000 : 5000;
    const current = Math.max(0, lifetimeSpend - base);
    const range = nextTier.target - base;
    return Math.min(100, Math.round((current / range) * 100));
  }, [tier, nextTier, lifetimeSpend]);

  if (!customer) return null;

  const initials = (customer.name || "C")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const handleSaveNotes = () => {
    setSavingNotes(true);
    if (onUpdateNotes) {
      onUpdateNotes(customer.id, notes);
    }
    setTimeout(() => {
      setSavingNotes(false);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    }, 300);
  };

  const handleRepeatLastOrder = () => {
    if (customerOrders.length === 0) return;
    const lastOrder = customerOrders[0];
    const itemNames = (lastOrder.items || [])
      .map((i) => `${i.qty}x ${i.name || i.menuItemId}`)
      .join(", ");

    navigator.clipboard?.writeText?.(itemNames);
    alert(`Last Order (${lastOrder.id || "Bill"}): ${itemNames}\n\nCopied order summary to clipboard!`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      {/* Slide-Over Container */}
      <div 
        className="w-full max-w-md bg-stone-900 border-l border-stone-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-stone-800 bg-stone-950/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-700/30 border border-amber-500/40 flex items-center justify-center font-bold text-amber-300 text-base shadow-inner shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-lg text-stone-50 truncate">{customer.name}</h2>
                <Pill tone={tier.tone} className="text-xs px-2 py-0.5 font-medium shrink-0">
                  {tier.name}
                </Pill>
              </div>
              <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
                <Phone size={12} className="text-stone-500 shrink-0" />
                {customer.phone || "No phone registered"}
              </p>
            </div>
          </div>

          <IconButton onClick={onClose} aria-label="Close profile">
            <X size={18} />
          </IconButton>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Overview Stat Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-stone-800/60 border border-stone-800 rounded-xl p-3.5 flex flex-col">
              <span className="text-xs font-medium text-stone-400 flex items-center gap-1.5">
                <Star size={13} className="text-amber-400" /> Loyalty Points
              </span>
              <span className="text-2xl font-bold text-amber-300 mt-1">
                {customer.points || 0}
              </span>
              <span className="text-[11px] text-stone-500 mt-0.5">
                ₹1 = 1 Point on redeem
              </span>
            </div>

            <div className="bg-stone-800/60 border border-stone-800 rounded-xl p-3.5 flex flex-col">
              <span className="text-xs font-medium text-stone-400 flex items-center gap-1.5">
                <ShoppingBag size={13} className="text-emerald-400" /> Lifetime Spend
              </span>
              <span className="text-2xl font-bold text-emerald-400 mt-1">
                {currency(lifetimeSpend)}
              </span>
              <span className="text-[11px] text-stone-500 mt-0.5">
                {customerOrders.length} total visit{customerOrders.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Birthday / Anniversary Banner if applicable */}
          {(bdayDays !== null && bdayDays <= 30) && (
            <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-3 flex items-center gap-3">
              <div className="text-2xl">🎂</div>
              <div>
                <p className="text-xs font-medium text-amber-300">Upcoming Birthday</p>
                <p className="text-[11px] text-amber-400/80">
                  {bdayDays === 0 ? "Birthday is TODAY! 🥳 Offer a complimentary treat!" : `Birthday in ${bdayDays} day${bdayDays > 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
          )}

          {/* Tier Progress Bar */}
          <div className="bg-stone-800/40 border border-stone-800 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-300 font-medium flex items-center gap-1">
                <Award size={14} className="text-amber-400" /> Membership Tier
              </span>
              <span className="text-amber-400 font-bold">{tier.name}</span>
            </div>
            <div className="w-full bg-stone-700/50 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-500 to-amber-300 h-full transition-all duration-300" 
                style={{ width: `${tierProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-stone-400 text-right">
              {nextTier ? (
                <>Spend <strong className="text-stone-200">{currency(nextTier.needed)}</strong> more to reach <strong className="text-amber-300">{nextTier.name}</strong></>
              ) : (
                <span className="text-purple-300 font-medium">👑 Top Tier Achieved!</span>
              )}
            </p>
          </div>

          {/* Top Favorite Items */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-400" /> Favorite Items
            </h4>
            {favoriteItems.length === 0 ? (
              <p className="text-xs text-stone-500 italic bg-stone-800/30 p-3 rounded-lg border border-stone-800/40">
                No favorite items logged yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {favoriteItems.map(([name, count]) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700/60 text-xs text-stone-200 font-medium"
                  >
                    <span>{name}</span>
                    <span className="text-[10px] text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded font-bold">
                      {count}x
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Staff Notes */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <StickyNote size={13} className="text-amber-400" /> Staff Notes & Preferences
              </h4>
              {notesSaved && (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 size={12} /> Saved
                </span>
              )}
            </div>
            <div className="relative">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add dietary preferences, allergies, custom requests..."
                rows={3}
                className="w-full rounded-xl bg-stone-850 border border-stone-750 p-3 text-xs text-stone-100 placeholder-stone-500 focus:outline-hidden focus:border-amber-500/60 transition-colors"
              />
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-[11px] flex items-center gap-1 transition-all shadow-xs"
              >
                <Save size={11} /> {savingNotes ? "Saving..." : "Save Note"}
              </button>
            </div>
          </div>

          {/* Recent Orders Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
              <Receipt size={13} className="text-amber-400" /> Recent Order Timeline
            </h4>

            {customerOrders.length === 0 ? (
              <p className="text-xs text-stone-500 italic bg-stone-800/30 p-3 rounded-lg border border-stone-800/40">
                No previous orders recorded for this customer.
              </p>
            ) : (
              <div className="space-y-2.5 relative before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-800">
                {customerOrders.slice(0, 5).map((order) => (
                  <div 
                    key={order.id} 
                    className="relative pl-7 bg-stone-850/60 border border-stone-800 rounded-xl p-3 space-y-1 hover:border-stone-700 transition-colors"
                  >
                    <span className="absolute left-2 top-3.5 w-2.5 h-2.5 rounded-full bg-amber-400 ring-4 ring-stone-900" />
                    
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-stone-200">
                        Bill #{order.id}
                      </span>
                      <span className="font-bold text-emerald-400">
                        {currency(order.grandTotal || order.total || 0)}
                      </span>
                    </div>

                    <div className="text-[11px] text-stone-400 flex justify-between">
                      <span>{order.timestamp ? new Date(order.timestamp).toLocaleString() : "Recent"}</span>
                      <span className="capitalize text-stone-500">{order.paymentMode || "Cash"}</span>
                    </div>

                    {order.items && order.items.length > 0 && (
                      <p className="text-[11px] text-stone-400 truncate pt-1 border-t border-stone-800/60 mt-1">
                        {order.items.map((i) => `${i.qty}x ${i.name || i.menuItemId}`).join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Quick Actions */}
        <div className="p-4 border-t border-stone-800 bg-stone-950/90 flex items-center justify-between gap-2">
          <button
            onClick={handleRepeatLastOrder}
            disabled={customerOrders.length === 0}
            className="flex-1 py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-40 disabled:hover:bg-stone-800 text-stone-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors border border-stone-750"
          >
            <RotateCcw size={14} className="text-amber-400" /> Repeat Last Order
          </button>

          <button
            onClick={() => onEdit(customer)}
            className="py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors border border-stone-750"
          >
            <Edit2 size={14} className="text-blue-400" /> Edit
          </button>

          <button
            onClick={() => setShowConfirmDelete(true)}
            className="py-2 px-3 rounded-xl bg-red-950/60 hover:bg-red-900/60 text-red-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors border border-red-900/50"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      {showConfirmDelete && (
        <ConfirmDialog
          title="Delete Customer"
          message={`Are you sure you want to delete ${customer.name}? Loyalty points and customer history for this profile will be permanently removed.`}
          confirmLabel="Delete Customer"
          onConfirm={() => {
            onDelete(customer.id);
            setShowConfirmDelete(false);
            onClose();
          }}
          onCancel={() => setShowConfirmDelete(false)}
        />
      )}
    </div>
  );
}
