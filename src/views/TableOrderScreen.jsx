import { useState } from "react";
import { ArrowLeft, Zap, StickyNote, MessageSquare, Edit3 } from "lucide-react";
import { IconButton, PrimaryButton } from "../components/ui.jsx";
import MenuPicker from "../components/MenuPicker.jsx";
import CartSummary from "../components/CartSummary.jsx";
import BillModal from "../components/BillModal.jsx";
import { currency, orderTotal } from "../lib/currency.js";

// Full-screen takeover on a table: pick items, manage cart, add notes, generate bill.
export default function TableOrderScreen({ table, menuItems, customers, onClose, onSave, onGenerateBill }) {
  const [cart, setCart] = useState(table.items || []);
  const [customerName, setCustomerName] = useState(table.customerName || "");
  const [orderNotes, setOrderNotes] = useState(table.orderNotes || "");
  const [discountPct, setDiscountPct] = useState(0);
  const [gstOn, setGstOn] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [showMobileCartDrawer, setShowMobileCartDrawer] = useState(false);
  const [priority, setPriority] = useState(table.priority || "Normal");
  const [editingItemNoteIndex, setEditingItemNoteIndex] = useState(null);
  const [tempItemNote, setTempItemNote] = useState("");

  const totals = orderTotal(cart, menuItems, discountPct, gstOn);
  const isRush = priority === "Rush";

  const handleSaveItemNote = (idx) => {
    setCart((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, notes: tempItemNote.trim() } : item))
    );
    setEditingItemNoteIndex(null);
    setTempItemNote("");
  };

  return (
    <div className="fixed inset-0 z-30 bg-stone-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-stone-800">
        <IconButton onClick={onClose} aria-label="Back to tables"><ArrowLeft size={18} /></IconButton>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-serif text-stone-50 truncate">{table.name || `Table ${table.number}`}</h2>
          <p className="text-xs text-stone-400">{cart.length} item{cart.length !== 1 ? "s" : ""} in order</p>
        </div>
        <button
          onClick={() => setPriority((p) => (p === "Rush" ? "Normal" : "Rush"))}
          className={`rounded-xl px-3.5 py-2 text-xs font-bold border flex items-center gap-1.5 transition min-h-[44px] cursor-pointer ${
            isRush
              ? "bg-purple-600 text-white border-purple-500 animate-pulse shadow-md"
              : "bg-stone-900 text-stone-300 border-stone-800 hover:bg-purple-900/40 hover:text-purple-300"
          }`}
          aria-label="Toggle rush order priority"
        >
          <Zap size={14} /> {isRush ? "🔥 RUSH ORDER" : "Normal Priority"}
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Customer & Order Note Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">Customer Name (Optional)</label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full min-h-[44px] rounded-xl bg-stone-900 border border-stone-800 px-3.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1">
              <StickyNote size={12} className="text-amber-400" /> Order Kitchen Note (Optional)
            </label>
            <input
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="e.g. Customer is in a hurry, serve drinks first"
              className="w-full min-h-[44px] rounded-xl bg-stone-900 border border-stone-800 px-3.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Menu Item Picker */}
        <MenuPicker menuItems={menuItems} cart={cart} setCart={setCart} />

        {/* Item-Level Notes Editor Section */}
        {cart.length > 0 && (
          <div className="rounded-xl bg-stone-900 border border-stone-800 p-3 space-y-2">
            <h4 className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
              <MessageSquare size={13} className="text-amber-400" /> Item Special Preparation Instructions
            </h4>
            <div className="divide-y divide-stone-800/80">
              {cart.map((it, idx) => {
                const mi = menuItems.find((m) => m.id === it.menuItemId);
                const isEditing = editingItemNoteIndex === idx;

                return (
                  <div key={`${it.menuItemId}-${idx}`} className="py-2 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <span className="font-bold text-amber-400 mr-2">{it.qty}x</span>
                      <span className="text-stone-200 font-medium">{mi?.name || "Item"}</span>
                      {it.notes && (
                        <p className="text-[11px] text-amber-300/90 italic mt-0.5">Note: "{it.notes}"</p>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="text"
                          value={tempItemNote}
                          onChange={(e) => setTempItemNote(e.target.value)}
                          placeholder="e.g. Less sugar, No onion"
                          className="rounded-lg bg-stone-800 border border-stone-700 px-2 py-1 text-xs text-stone-100 placeholder-stone-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveItemNote(idx)}
                          className="px-2 py-1 rounded bg-amber-500 text-stone-950 font-bold text-xs"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingItemNoteIndex(idx);
                          setTempItemNote(it.notes || "");
                        }}
                        className="text-stone-400 hover:text-amber-300 flex items-center gap-1 text-[11px] bg-stone-800 px-2 py-1 rounded border border-stone-700 shrink-0 cursor-pointer"
                      >
                        <Edit3 size={11} /> {it.notes ? "Edit Note" : "+ Add Note"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Sticky Compact Cart Summary Bar */}
      {cart.length > 0 && (
        <div className="md:hidden fixed bottom-0 inset-x-0 bg-stone-900 border-t border-stone-800 p-3 z-30 flex items-center justify-between shadow-2xl">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-stone-100">
              Cart • {cart.length} item{cart.length !== 1 ? "s" : ""}
            </span>
            <span className="text-xs font-mono font-bold text-amber-400">
              {currency(totals.grandTotal)}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowMobileCartDrawer(true)}
              className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 text-xs font-bold border border-stone-700 cursor-pointer"
            >
              View Cart
            </button>
            <PrimaryButton
              disabled={cart.length === 0}
              data-testid="mobile-generate-bill-btn"
              onClick={() => setShowBill(true)}
              className="px-3.5 py-2 text-xs font-bold"
            >
              Pay / Bill
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Mobile Cart Bottom Sheet Drawer */}
      {showMobileCartDrawer && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-stone-900 border-t border-stone-800 rounded-t-3xl p-4 flex flex-col gap-3 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-300">Order Cart Summary</span>
              <button
                onClick={() => setShowMobileCartDrawer(false)}
                className="text-stone-400 text-xs font-bold px-2 py-1 bg-stone-800 rounded-lg"
              >
                Close ✕
              </button>
            </div>

            <CartSummary
              cart={cart} menuItems={menuItems}
              discountPct={discountPct} setDiscountPct={setDiscountPct}
              gstOn={gstOn} setGstOn={setGstOn}
            />

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-800">
              <button
                onClick={() => { setCart([]); setShowMobileCartDrawer(false); }}
                className="rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 py-2.5 text-xs font-semibold cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                data-testid="mobile-save-order-btn"
                onClick={() => {
                  const unavailableCartItem = cart.find((item) => {
                    const mi = menuItems.find((m) => m.id === item.menuItemId);
                    return mi && mi.available === false;
                  });
                  if (unavailableCartItem) {
                    const mi = menuItems.find((m) => m.id === unavailableCartItem.menuItemId);
                    alert(`"${mi?.name || "Item"}" is no longer available.`);
                    return;
                  }
                  onSave(cart, customerName, { priority, orderNotes });
                  setShowMobileCartDrawer(false);
                  onClose();
                }}
                className="rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-100 py-2.5 text-xs font-bold cursor-pointer"
              >
                Save
              </button>
              <PrimaryButton
                disabled={cart.length === 0}
                data-testid="mobile-generate-bill-btn"
                onClick={() => { setShowMobileCartDrawer(false); setShowBill(true); }}
                className="py-2.5 text-xs font-bold"
              >
                Bill
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Primary Footer Cart Summary & Action Buttons */}
      <div className="border-t border-stone-800 p-4 flex flex-col gap-3 bg-stone-950">
        <CartSummary
          cart={cart} menuItems={menuItems}
          discountPct={discountPct} setDiscountPct={setDiscountPct}
          gstOn={gstOn} setGstOn={setGstOn}
        />
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setCart([])}
            className="rounded-xl border border-stone-700 text-stone-300 hover:bg-stone-800 py-3 text-xs font-semibold min-h-[48px] cursor-pointer"
          >
            Clear Cart
          </button>
          <button
            type="button"
            data-testid="save-order-btn"
            onClick={() => {
              const unavailableCartItem = cart.find((item) => {
                const mi = menuItems.find((m) => m.id === item.menuItemId);
                return mi && mi.available === false;
              });
              if (unavailableCartItem) {
                const mi = menuItems.find((m) => m.id === unavailableCartItem.menuItemId);
                alert(`"${mi?.name || "Item"}" is no longer available. Please remove it from the cart to proceed.`);
                return;
              }
              onSave(cart, customerName, { priority, orderNotes });
              onClose();
            }}
            className="rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-100 py-3 text-xs font-bold min-h-[48px] cursor-pointer"
          >
            Save / Send Kitchen
          </button>
          <PrimaryButton
            disabled={cart.length === 0}
            data-testid="generate-bill-btn"
            onClick={() => setShowBill(true)}
            className="min-h-[48px] text-xs font-bold"
          >
            Generate Bill
          </PrimaryButton>
        </div>
      </div>

      {/* Bill Checkout Modal */}
      {showBill && (
        <BillModal
          title={table.name || `Table ${table.number}`}
          customerName={customerName}
          cart={cart}
          menuItems={menuItems}
          totals={totals}
          customers={customers}
          onClose={() => setShowBill(false)}
          onConfirm={async (paymentMode, phone, redeemedPoints, splitBreakdown) => {
            await onGenerateBill(cart, customerName, totals, paymentMode, phone, redeemedPoints, splitBreakdown);
            setShowBill(false);
            onClose();
          }}
        />
      )}
    </div>
  );
}
