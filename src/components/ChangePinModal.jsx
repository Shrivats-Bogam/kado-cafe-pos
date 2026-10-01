import { useState } from "react";
import { KeyRound, Lock, Check, X, AlertCircle } from "lucide-react";
import { updateMyPin } from "../lib/storage.js";
import { PrimaryButton, SecondaryButton } from "./ui.jsx";

export default function ChangePinModal({ isOpen, onClose, currentUser, onPinChanged }) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");

    if (!currentPin) {
      setError("Please enter your current PIN.");
      return;
    }

    if (!/^\d{4,6}$/.test(newPin)) {
      setError("New PIN must be 4 to 6 digits.");
      return;
    }

    if (newPin !== confirmPin) {
      setError("New PIN and confirmation do not match.");
      return;
    }

    if (newPin === currentPin) {
      setError("New PIN must be different from current PIN.");
      return;
    }

    setLoading(true);
    try {
      await updateMyPin(currentUser.id, currentPin, newPin);
      setSuccess(true);
      if (onPinChanged) onPinChanged(newPin);
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      setError(err?.message || "Failed to update PIN. Please verify your current PIN.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setError("");
    setSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-stone-400 hover:text-stone-100 p-1 rounded-lg transition"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <KeyRound size={20} />
          </div>
          <div>
            <h3 className="font-bold text-stone-100 text-base">Change My PIN</h3>
            <p className="text-xs text-stone-400">{currentUser?.name || "Staff Member"}</p>
          </div>
        </div>

        {success ? (
          <div className="py-6 flex flex-col items-center justify-center text-center gap-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Check size={24} />
            </div>
            <p className="text-sm font-bold text-stone-100">PIN Updated Successfully!</p>
            <p className="text-xs text-stone-400">Your session is updated with your new PIN.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Current PIN</label>
              <div className="relative">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter current PIN"
                  className="w-full min-h-[44px] bg-stone-950 border border-stone-800 rounded-xl px-3 pl-9 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  autoFocus
                  required
                />
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">New PIN (4–6 digits)</label>
              <div className="relative">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter new 4-6 digit PIN"
                  className="w-full min-h-[44px] bg-stone-950 border border-stone-800 rounded-xl px-3 pl-9 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  required
                />
                <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Confirm New PIN</label>
              <div className="relative">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Re-enter new PIN"
                  className="w-full min-h-[44px] bg-stone-950 border border-stone-800 rounded-xl px-3 pl-9 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  required
                />
                <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <SecondaryButton type="button" onClick={handleClose} className="flex-1">
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={loading} className="flex-1">
                {loading ? "Saving..." : "Update PIN"}
              </PrimaryButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
