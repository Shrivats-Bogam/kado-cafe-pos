import { useState } from "react";
import { User, Phone, Mail, Lock, Shield, Building } from "lucide-react";
import { Modal, ModalHeader, PrimaryButton, TextInput } from "./ui.jsx";

const ROLES = ["Owner", "Manager", "Cashier", "Staff", "Waiter", "Kitchen"];
const DEPARTMENTS = ["Management", "Operations", "Service", "Kitchen"];

export function EmployeeModal({ employee, onSave, onClose }) {
  const [formData, setFormData] = useState({
    id: employee?.id || "",
    name: employee?.name || "",
    phone: employee?.phone || "",
    email: employee?.email || "",
    role: employee?.role || "Staff",
    department: employee?.department || "Service",
    pin: employee?.pin || "",
  });
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!formData.pin || formData.pin.length < 4) {
      setError("PIN must be at least 4 digits.");
      return;
    }

    try {
      onSave(formData);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save employee.");
    }
  };

  return (
    <Modal onClose={onClose}>
      <ModalHeader title={employee ? "Edit Employee" : "Add New Employee"} icon={User} onClose={onClose} />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-stone-400 mb-1 block">Full Name</label>
          <TextInput
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. John Doe"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-stone-400 mb-1 block">Phone Number</label>
            <TextInput
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="10-digit phone"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-400 mb-1 block">4-Digit PIN</label>
            <TextInput
              type="password"
              maxLength={6}
              value={formData.pin}
              onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
              placeholder="e.g. 1234"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-stone-400 mb-1 block">Email (Optional)</label>
          <TextInput
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="john@kadocafe.com"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-stone-400 mb-1 block">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full min-h-[44px] rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-400 mb-1 block">Department</label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full min-h-[44px] rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-stone-700 bg-stone-800 text-stone-300 text-xs font-semibold hover:bg-stone-700"
          >
            Cancel
          </button>
          <PrimaryButton type="submit">
            {employee ? "Update Employee" : "Save Employee"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
