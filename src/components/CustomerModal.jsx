import { useState, useEffect } from "react";
import { X, User, Phone, Calendar, Heart, StickyNote } from "lucide-react";
import { Card, PrimaryButton, IconButton, TextInput } from "./ui.jsx";

export function CustomerModal({ customer, onClose, onSave }) {
  const isEdit = Boolean(customer);

  const [name, setName] = useState(customer?.name || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [birthday, setBirthday] = useState(customer?.birthday || "");
  const [anniversary, setAnniversary] = useState(customer?.anniversary || "");
  const [notes, setNotes] = useState(customer?.notes || "");

  useEffect(() => {
    if (customer) {
      setName(customer.name || "");
      setPhone(customer.phone || "");
      setBirthday(customer.birthday || "");
      setAnniversary(customer.anniversary || "");
      setNotes(customer.notes || "");
    }
  }, [customer]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || phone.length < 6) return;

    const payload = {
      id: customer ? customer.id : "c" + Date.now(),
      name: name.trim(),
      phone: phone.trim(),
      birthday: birthday || "",
      anniversary: anniversary || "",
      notes: notes.trim(),
      totalOrders: customer ? customer.totalOrders : 0,
      points: customer ? customer.points : 0,
      lastVisit: customer ? customer.lastVisit : null,
    };

    onSave(payload);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card 
        className="w-full max-w-md p-6 flex flex-col gap-5 shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-stone-800 pb-3">
          <h3 className="font-semibold text-lg text-stone-50 flex items-center gap-2">
            <User size={18} className="text-amber-400" />
            {isEdit ? "Edit Customer Profile" : "Add New Customer"}
          </h3>
          <IconButton onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </IconButton>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">
              Customer Name <span className="text-amber-400">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              required
              className="w-full rounded-xl bg-stone-800 border border-stone-700 px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">
              Phone Number <span className="text-amber-400">*</span>
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit mobile number"
              required
              type="tel"
              className="w-full rounded-xl bg-stone-800 border border-stone-700 px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1 flex items-center gap-1">
                <Calendar size={12} className="text-stone-500" /> Birthday (Optional)
              </label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full rounded-xl bg-stone-800 border border-stone-700 px-3 py-2 text-xs text-stone-200 focus:outline-hidden focus:border-amber-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1 flex items-center gap-1">
                <Heart size={12} className="text-stone-500" /> Anniversary (Optional)
              </label>
              <input
                type="date"
                value={anniversary}
                onChange={(e) => setAnniversary(e.target.value)}
                className="w-full rounded-xl bg-stone-800 border border-stone-700 px-3 py-2 text-xs text-stone-200 focus:outline-hidden focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1 flex items-center gap-1">
              <StickyNote size={12} className="text-stone-500" /> Staff Notes & Preferences
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Prefers oat milk, allergic to peanuts..."
              rows={2}
              className="w-full rounded-xl bg-stone-800 border border-stone-700 px-3.5 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <PrimaryButton
              type="submit"
              disabled={!name.trim() || phone.length < 6}
              className="px-5 py-2 text-xs"
            >
              {isEdit ? "Save Changes" : "Create Customer"}
            </PrimaryButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
