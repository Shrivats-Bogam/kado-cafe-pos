import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import { Card, IconButton, Pill, PrimaryButton } from "../components/ui.jsx";
import { ROLE_LABELS } from "../data/defaults.js";

// Settings panel: Team management + integration notes.
// PIN-based local auth is the MVP. For real multi-tenant usage proxy through Supabase Auth.

export default function SettingsPanel({ users, onAddUser, onRemoveUser, onClose }) {
  const [tab, setTab] = useState("team");

  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 overflow-y-auto flex items-start sm:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <Card className="w-full sm:max-w-md p-5 flex flex-col gap-3 my-4 sm:my-0">
        <div className="flex justify-between items-center">
          <h3 className="font-serif text-lg text-stone-50">Settings</h3>
          <IconButton onClick={onClose}><X size={16} /></IconButton>
        </div>

        <div className="flex gap-2">
          {["team", "integrations"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border capitalize ${
                tab === t ? "bg-amber-500 text-stone-950 border-amber-500" : "bg-stone-800 text-stone-300 border-stone-700"
              }`}
            >{t}</button>
          ))}
        </div>

        {tab === "team" ? (
          <TeamSettingsInline users={users} onAdd={onAddUser} onRemove={onRemoveUser} />
        ) : (
          <div className="flex flex-col gap-3 text-sm">
            <div className="rounded-xl bg-stone-800/70 p-3">
              <p className="font-medium text-stone-100 mb-1">Supabase Cloud Sync</p>
              <p className="text-xs text-stone-400">
                Multi-device sync + customer QR ordering need a Supabase project. See the setup
                guide on your Desktop (<code>README-supabase-setup.md</code>). Once keys are added
                to <code>.env</code> the app uses Supabase automatically.
              </p>
            </div>
            <div className="rounded-xl bg-stone-800/70 p-3">
              <p className="font-medium text-stone-100 mb-1">Swiggy / Zomato</p>
              <p className="text-xs text-stone-400">
                Not connected. These platforms require an approved partner API (or middleware like
                UrbanPiper) — not something that can be self-served from here. Ask your account
                manager about partner API access, then this is the next thing to wire up.
              </p>
            </div>
            <div className="rounded-xl bg-stone-800/70 p-3">
              <p className="font-medium text-stone-100 mb-1">Bluetooth Thermal Printer</p>
              <p className="text-xs text-stone-400">
                Direct Bluetooth pairing isn't available in a web app. Use the "Print Receipt"
                button at billing instead — it works with any thermal printer set up as a normal
                system / Android printer.
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function TeamSettingsInline({ users, onAdd, onRemove }) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState("Staff");

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-stone-500">
        Local PIN login for this device — Staff can only take orders/bills, Manager adds
        Menu/Reports/Customers/Insights, Owner has everything.
      </p>

      {users.map((u) => (
        <div key={u.id} className="flex items-center justify-between rounded-xl bg-stone-800/70 px-3 py-2">
          <div>
            <p className="text-sm text-stone-100">{u.name} <span className="text-stone-500">· PIN {u.pin}</span></p>
            <Pill tone="amber">{ROLE_LABELS[u.role] || u.role}</Pill>
          </div>
          {users.length > 1 && (
            <IconButton onClick={() => onRemove(u.id)}><Trash2 size={14} /></IconButton>
          )}
        </div>
      ))}

      <div className="border-t border-stone-800 pt-3 flex flex-col gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm"
        />
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="4-digit PIN"
          className="rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm"
        >
          {["Staff", "Manager", "Owner"].map((r) => <option key={r}>{r}</option>)}
        </select>
        <PrimaryButton
          disabled={!name || pin.length !== 4}
          onClick={() => {
            onAdd({ id: "u" + Date.now(), name, pin, role });
            setName(""); setPin(""); setRole("Staff");
          }}
        >Add Team Member</PrimaryButton>
      </div>
    </div>
  );
}
