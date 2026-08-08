import { useState, useMemo } from "react";
import { X, Phone, Mail, MapPin, Gift, History, Heart, Edit3, Repeat, Award, Check, AlertTriangle, Calendar, UserCheck } from "lucide-react";
import { Card, PrimaryButton } from "./ui.jsx";
import { currency } from "../lib/currency.js";
import { useMenuIndex } from "../lib/menuIndex.js";
import { topFavoriteItems, daysUntilBirthday } from "../lib/loyalty.js";

export default function CustomerProfileModal({ 
  customer, 
  orderHistory = [], 
  menuItems = [], 
  onSaveNotes, 
  onEditProfile,
  onQuickReorder, 
  onClose 
}) {
  const [notes, setNotes] = useState(customer?.notes || "");
  const [savedNotesSuccess, setSavedNotesSuccess] = useState(false);
  const [reorderWarning, setReorderWarning] = useState(null);

  const menuIdx = useMenuIndex(menuItems);

  if (!customer) return null;

  // Filter orders matching customer
  const customerOrders = useMemo(() => {
    return orderHistory.filter((o) => 
      o.customerId === customer.id || o.phone === customer.phone || o.customerName === customer.name
    ).sort((a, b) => new Date(b.paidAt || b.createdAt || 0) - new Date(a.paidAt || a.createdAt || 0));
  }, [orderHistory, customer]);

  // Compute Top 5 Favorite Items using topFavoriteItems helper
  const favoriteItems = useMemo(() => {
    return topFavoriteItems(customer.id, orderHistory, menuItems);
  }, [customer, orderHistory, menuItems]);

  // Last order for quick reorder
  const lastOrder = customerOrders[0];

  const handleSaveNotes = () => {
    if (onSaveNotes) {
      onSaveNotes(customer.id, { notes });
      setSavedNotesSuccess(true);
      setTimeout(() => setSavedNotesSuccess(false), 2000);
    }
  };

  const handleReorderClick = () => {
    if (!lastOrder || !lastOrder.items || !onQuickReorder) return;
    setReorderWarning(null);

    // PART 22: Check menu availability before adding items
    const availableItems = [];
    const unavailableItems = [];

    lastOrder.items.forEach((it) => {
      const foundInMenu = menuItems.find(m => m.id === it.menuItemId || m.name === (it.name || it.menuItemId));
      if (foundInMenu && foundInMenu.available !== false) {
        availableItems.push({
          menuItemId: foundInMenu.id,
          name: foundInMenu.name,
          price: foundInMenu.price,
          qty: it.qty || 1
        });
      } else {
        unavailableItems.push(it.name || it.menuItemId);
      }
    });

    if (unavailableItems.length > 0) {
      setReorderWarning(`Some items are currently unavailable (${unavailableItems.join(", ")}).`);
    }

    if (availableItems.length > 0) {
      onQuickReorder(availableItems);
    }
  };

  const tier = customer.membership || "Silver";
  let tierBadge = "bg-stone-800 text-stone-300 border-stone-700";
  let tierIcon = "🥈";
  if (tier === "Gold") {
    tierBadge = "bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold";
    tierIcon = "🥇";
  } else if (tier === "Platinum") {
    tierBadge = "bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold";
    tierIcon = "💎";
  }

  const dUntil = daysUntilBirthday(customer.birthday);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <Card className="w-full max-w-2xl bg-stone-900 border border-stone-800 flex flex-col gap-4 max-h-[90vh] overflow-hidden my-auto p-5 shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-stone-800 pb-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-xl font-bold text-stone-50">{customer.name}</h3>
              <span className={`px-2.5 py-0.5 text-xs rounded-full border ${tierBadge}`}>
                {tierIcon} {tier} Member
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-stone-400 mt-1 flex-wrap font-mono">
              <span className="flex items-center gap-1"><Phone size={12} className="text-amber-500" /> {customer.phone}</span>
              {customer.email && <span className="flex items-center gap-1 font-sans"><Mail size={12} /> {customer.email}</span>}
              {customer.address && <span className="flex items-center gap-1 font-sans"><MapPin size={12} /> {customer.address}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEditProfile && (
              <button
                type="button"
                onClick={() => onEditProfile(customer)}
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <Edit3 size={14} /> Edit Profile
              </button>
            )}
            <button type="button" onClick={onClose} className="p-1 text-stone-400 hover:text-stone-200 cursor-pointer">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-stone-950 p-3 rounded-xl border border-stone-800">
            <div>
              <span className="text-stone-500 text-[10px] uppercase font-bold block">Lifetime Spend</span>
              <span className="text-base font-bold text-amber-400 font-serif">{currency(customer.lifetimeSpend || 0)}</span>
            </div>
            <div>
              <span className="text-stone-500 text-[10px] uppercase font-bold block">Total Visits</span>
              <span className="text-base font-bold text-stone-200 font-mono">{customer.totalVisits || customer.totalOrders || 0} visits</span>
            </div>
            <div>
              <span className="text-stone-500 text-[10px] uppercase font-bold block">Loyalty Points</span>
              <span className="text-base font-bold text-purple-400 font-mono flex items-center gap-1">
                <Gift size={13} /> {customer.points || 0} pts
              </span>
            </div>
            <div>
              <span className="text-stone-500 text-[10px] uppercase font-bold block">Last Visit</span>
              <span className="text-xs text-stone-300 font-medium">
                {customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString() : "Never"}
              </span>
            </div>
          </div>

          {/* Birthday / Celebration Alert */}
          {dUntil !== null && dUntil <= 14 && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-xs text-amber-300 flex items-center gap-2 font-medium">
              <Calendar size={16} className="text-amber-400 shrink-0" />
              <span>Birthday Celebration {dUntil === 0 ? "is Today! 🎂" : `is in ${dUntil} days!`}</span>
            </div>
          )}

          {/* Quick Reorder Banner */}
          {lastOrder && onQuickReorder && (
            <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-stone-200 block">Repeat Last Order</span>
                  <span className="text-[11px] text-stone-400">
                    {(lastOrder.items || []).map(i => `${i.name || i.menuItemId} x${i.qty}`).join(", ")} ({currency(lastOrder.grandTotal)})
                  </span>
                </div>
                <PrimaryButton
                  onClick={handleReorderClick}
                  className="min-h-[40px] px-3.5 text-xs font-bold shrink-0 active:scale-95 cursor-pointer"
                >
                  <Repeat size={14} /> Reorder
                </PrimaryButton>
              </div>

              {reorderWarning && (
                <div className="text-[11px] text-rose-400 flex items-center gap-1.5 pt-1 border-t border-stone-900">
                  <AlertTriangle size={13} /> {reorderWarning}
                </div>
              )}
            </div>
          )}

          {/* Staff Notes Editor */}
          <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                <Edit3 size={14} className="text-amber-500" /> Staff Preferences & Notes
              </span>
              <button
                type="button"
                onClick={handleSaveNotes}
                className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                {savedNotesSuccess ? <Check size={13} className="text-emerald-400" /> : null}
                {savedNotesSuccess ? "Saved" : "Save Note"}
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Likes extra hot coffee, prefers window table, allergic to peanuts..."
              rows={2}
              className="w-full bg-stone-900 border border-stone-800 rounded-lg p-2 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Top 5 Favorite Items */}
          {favoriteItems.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
                <Heart size={14} className="text-rose-500" /> Top 5 Favorite Items
              </h4>
              <div className="flex flex-wrap gap-2">
                {favoriteItems.map((fav, i) => (
                  <span key={i} className="bg-stone-950 border border-stone-800 px-3 py-1.5 rounded-xl text-xs text-stone-200 font-medium flex items-center gap-1.5">
                    <span>{fav.name}</span>
                    <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px]">
                      {fav.qty}x
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Complete Order History Timeline */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
              <History size={14} className="text-amber-500" /> Order History Timeline ({customerOrders.length})
            </h4>

            {customerOrders.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-500 border border-dashed border-stone-800 rounded-xl">
                No past billing transactions recorded for this customer yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {customerOrders.map((ord) => (
                  <div key={ord.id} className="bg-stone-950 p-3 rounded-xl border border-stone-800 flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono font-bold text-amber-400">{ord.id}</span>
                        <span className="text-stone-400 text-[11px] ml-2">{ord.source || "POS"}</span>
                      </div>
                      <span className="font-mono font-bold text-stone-100">{currency(ord.grandTotal)}</span>
                    </div>

                    <div className="text-stone-400 text-[11px]">
                      {(ord.items || []).map(i => `${i.name || i.menuItemId} ×${i.qty}`).join(", ")}
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-stone-500 pt-1 border-t border-stone-900">
                      <span>{new Date(ord.paidAt || ord.createdAt || Date.now()).toLocaleString()}</span>
                      <span>Paid via {ord.paymentMode || ord.paymentMethod || "Cash"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
