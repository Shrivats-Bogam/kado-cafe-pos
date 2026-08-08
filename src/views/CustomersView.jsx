import { useState } from "react";
import { Users, X, UserPlus, Edit3, Phone, AlertCircle } from "lucide-react";
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
  const [editingCustomer, setEditingCustomer] = useState(null);

  return (
    <div className="flex flex-col gap-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900 p-4 rounded-2xl border border-stone-800">
        <div>
          <h2 className="text-xl font-serif font-bold text-stone-50 flex items-center gap-2">
            <Users className="text-amber-500" size={22} /> Commercial Customer CRM & Loyalty
          </h2>
          <p className="text-xs text-stone-400">Track customer profiles, membership tiers, loyalty points, and purchase history</p>
        </div>

        <PrimaryButton
          onClick={() => setShowNewModal(true)}
          className="min-h-[44px] px-4 text-xs font-bold shrink-0 shadow-md shadow-amber-500/20 cursor-pointer"
        >
          <UserPlus size={16} /> New Customer Profile
        </PrimaryButton>
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
          onEditProfile={(c) => setEditingCustomer(c)}
          onQuickReorder={onQuickReorder}
          onClose={() => setSelectedCustomer(null)}
        />
      )}

      {/* New Customer Modal */}
      {showNewModal && (
        <CustomerFormModal 
          customers={customers}
          onClose={() => setShowNewModal(false)}
          onSubmit={(c) => {
            onAdd(c);
            setShowNewModal(false);
          }}
          onOpenExisting={(existing) => {
            setShowNewModal(false);
            setSelectedCustomer(existing);
          }}
        />
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <CustomerFormModal 
          customer={editingCustomer}
          customers={customers}
          onClose={() => setEditingCustomer(null)}
          onSubmit={(patchData) => {
            if (onEdit) onEdit(editingCustomer.id, patchData);
            setEditingCustomer(null);
            if (selectedCustomer?.id === editingCustomer.id) {
              setSelectedCustomer(prev => ({ ...prev, ...patchData }));
            }
          }}
          onOpenExisting={(existing) => {
            setEditingCustomer(null);
            setSelectedCustomer(existing);
          }}
        />
      )}
    </div>
  );
}

// Subcomponent: Add / Edit Customer Form Modal with Duplicate Phone Check
export function CustomerFormModal({ customer, customers = [], onClose, onSubmit, onOpenExisting }) {
  const [name, setName] = useState(customer ? customer.name : "");
  const [phone, setPhone] = useState(customer ? customer.phone : "");
  const [email, setEmail] = useState(customer ? customer.email || "" : "");
  const [birthday, setBirthday] = useState(customer ? customer.birthday || "" : "");
  const [anniversary, setAnniversary] = useState(customer ? customer.anniversary || "" : "");
  const [address, setAddress] = useState(customer ? customer.address || "" : "");
  const [notes, setNotes] = useState(customer ? customer.notes || "" : "");

  const [dupError, setDupError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "").slice(0, 10);
    if (!name.trim() || cleanPhone.length < 6) return;

    // Check duplicate phone number
    const existing = customers.find(c => c.id !== customer?.id && c.phone === cleanPhone);
    if (existing) {
      setDupError(existing);
      return;
    }

    if (customer) {
      onSubmit({
        name: name.trim(),
        phone: cleanPhone,
        email: email.trim(),
        birthday,
        anniversary,
        address: address.trim(),
        notes: notes.trim()
      });
    } else {
      onSubmit({
        id: "c" + Date.now(),
        name: name.trim(),
        phone: cleanPhone,
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
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <Card className="w-full max-w-md p-5 bg-stone-900 border border-stone-800 flex flex-col gap-4 my-auto shadow-2xl rounded-2xl">
        <div className="flex justify-between items-center border-b border-stone-800 pb-3">
          <h3 className="font-serif font-bold text-stone-50 text-base">
            {customer ? "Edit Customer Profile" : "New Customer Profile"}
          </h3>
          <IconButton onClick={onClose}><X size={16} /></IconButton>
        </div>

        {dupError && (
          <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl flex items-center justify-between gap-2 text-xs text-rose-300">
            <div className="flex items-center gap-1.5">
              <AlertCircle size={15} className="shrink-0" />
              <span>Customer with phone <strong>{dupError.phone}</strong> already exists ({dupError.name})</span>
            </div>
            {onOpenExisting && (
              <button
                type="button"
                onClick={() => onOpenExisting(dupError)}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-200 font-bold shrink-0 hover:bg-rose-500/30 cursor-pointer"
              >
                Open
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-xs">
          <div>
            <label className="text-stone-400 font-semibold block mb-1">Customer Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-stone-400 font-semibold block mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                  setDupError(null);
                }}
                placeholder="10 digits"
                className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 font-mono placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-stone-400 font-semibold block mb-1">Email</label>
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
              <label className="text-stone-400 font-semibold block mb-1">Birthday</label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-stone-400 font-semibold block mb-1">Anniversary</label>
              <input
                type="date"
                value={anniversary}
                onChange={(e) => setAnniversary(e.target.value)}
                className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-stone-400 font-semibold block mb-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Locality, City..."
              className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-stone-400 font-semibold block mb-1">Staff Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Preferences, allergies, VIP status..."
              rows={2}
              className="w-full rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-stone-800 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-stone-700 py-2.5 text-xs font-semibold text-stone-300 cursor-pointer"
            >
              Cancel
            </button>
            <PrimaryButton
              type="submit"
              disabled={!name.trim() || phone.replace(/\D/g, "").length < 6}
              className="flex-1 min-h-[44px] text-xs font-bold cursor-pointer"
            >
              {customer ? "Save Profile" : "Create Customer"}
            </PrimaryButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
