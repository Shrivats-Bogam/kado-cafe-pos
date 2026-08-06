import { useState } from "react";
import { Users, X } from "lucide-react";
import CRMAnalytics from "../components/CRMAnalytics.jsx";
import CustomerList from "../components/CustomerList.jsx";
import CustomerProfileModal from "../components/CustomerProfileModal.jsx";
import { Card, IconButton, PrimaryButton } from "../components/ui.jsx";

export default function CustomersView({ 
  customers = [], 
  orderHistory = [], 
  menuItems = [], 
  onAdd, 
  onEdit, 
  onDelete, 
  onQuickReorder 
}) {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900 p-4 rounded-2xl border border-stone-800">
        <div>
          <h2 className="text-xl font-serif font-bold text-stone-50 flex items-center gap-2">
            <Users className="text-amber-500" size={22} /> Customer CRM & Loyalty System
          </h2>
          <p className="text-xs text-stone-400">Track customer profiles, membership tiers, loyalty points, and purchase history</p>
        </div>
      </div>

      {/* Analytics & Birthday Widget */}
      <CRMAnalytics customers={customers} orderHistory={orderHistory} />

      {/* Customer List Grid */}
      <CustomerList 
        customers={customers}
        onSelectCustomer={(c) => setSelectedCustomer(c)}
        onAddCustomer={() => setShowNewModal(true)}
        onDeleteCustomer={onDelete}
      />

      {/* Customer Profile Modal */}
      {selectedCustomer && (
        <CustomerProfileModal 
          customer={selectedCustomer}
          orderHistory={orderHistory}
          menuItems={menuItems}
          onSaveNotes={(id, patch) => {
            if (onEdit) onEdit(id, patch);
            setSelectedCustomer(prev => ({ ...prev, ...patch }));
          }}
          onQuickReorder={onQuickReorder}
          onClose={() => setSelectedCustomer(null)}
        />
      )}

      {/* New Customer Modal */}
      {showNewModal && (
        <NewCustomerModal 
          onClose={() => setShowNewModal(false)}
          onCreate={(c) => {
            onAdd(c);
            setShowNewModal(false);
          }}
        />
      )}
    </div>
  );
}

function NewCustomerModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [anniversary, setAnniversary] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || phone.length < 6) return;

    onCreate({
      id: "c" + Date.now(),
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      birthday,
      anniversary,
      address: address.trim(),
      notes: notes.trim(),
      totalOrders: 0,
      totalVisits: 0,
      lifetimeSpend: 0,
      membership: "Silver",
      points: 0,
      lastVisit: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 overflow-y-auto flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-5 bg-stone-900 border border-stone-800 flex flex-col gap-4 my-auto">
        <div className="flex justify-between items-center border-b border-stone-800 pb-3">
          <h3 className="font-serif font-bold text-stone-50 text-base">New Customer Profile</h3>
          <IconButton onClick={onClose}><X size={16} /></IconButton>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-stone-400 block mb-1">Customer Name *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-stone-400 block mb-1">Phone Number *</label>
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10 digits"
                className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs text-stone-400 block mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@domain.com"
                className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-stone-400 block mb-1">Birthday</label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs text-stone-400 block mb-1">Anniversary</label>
              <input
                type="date"
                value={anniversary}
                onChange={(e) => setAnniversary(e.target.value)}
                className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-stone-400 block mb-1">Address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Locality, City..."
              className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs text-stone-400 block mb-1">Staff Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Preferences, allergies, VIP status..."
              rows={2}
              className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-stone-700 py-2.5 text-xs font-semibold text-stone-300"
            >
              Cancel
            </button>
            <PrimaryButton
              type="submit"
              disabled={!name || phone.length < 6}
              className="flex-1 min-h-[44px] text-xs font-bold"
            >
              Create Customer
            </PrimaryButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
