import { X } from "lucide-react";
import { Card, IconButton } from "../components/ui.jsx";
import SettingsView from "./SettingsView.jsx";

export default function SettingsPanel({ state = {}, dispatch, users, onAddUser, onRemoveUser, onClose, currentUser, onNavigate }) {
  return (
    <div
      className="fixed inset-0 z-40 bg-black/70 overflow-y-auto flex items-start sm:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-4xl bg-stone-950 p-4 rounded-2xl border border-stone-800 shadow-2xl my-4 sm:my-0 relative max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-3 mb-3 border-b border-stone-800 sticky top-0 bg-stone-950/95 backdrop-blur-md z-10">
          <h3 className="font-serif text-lg font-bold text-stone-50">Enterprise Settings Modal</h3>
          <IconButton onClick={onClose}><X size={16} /></IconButton>
        </div>

        <SettingsView 
          state={state} 
          dispatch={dispatch} 
          currentUser={currentUser} 
          onNavigate={(targetTab) => {
            onClose();
            if (onNavigate) onNavigate(targetTab);
          }} 
        />
      </div>
    </div>
  );
}
