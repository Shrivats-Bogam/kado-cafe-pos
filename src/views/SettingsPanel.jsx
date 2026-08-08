import { useState, useEffect } from "react";
import { X, Trash2, Bot, Check, AlertCircle, RefreshCw } from "lucide-react";
import { Card, IconButton, Pill, PrimaryButton } from "../components/ui.jsx";
import { ROLE_LABELS } from "../data/defaults.js";
import { getAISettings, saveAISettings, PROVIDERS, testAIConnection } from "../lib/ai.js";

export default function SettingsPanel({ users, onAddUser, onRemoveUser, onClose }) {
  const [tab, setTab] = useState("team");

  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 overflow-y-auto flex items-start sm:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <Card className="w-full sm:max-w-lg p-5 flex flex-col gap-3 my-4 sm:my-0 bg-stone-900 border-stone-800">
        <div className="flex justify-between items-center border-b border-stone-800 pb-2">
          <h3 className="font-serif text-lg font-bold text-stone-50">Settings</h3>
          <IconButton onClick={onClose}><X size={16} /></IconButton>
        </div>

        <div className="flex gap-2">
          {["team", "ai", "integrations"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold border capitalize transition cursor-pointer ${
                tab === t ? "bg-amber-500 text-stone-950 border-amber-500" : "bg-stone-950 text-stone-300 border-stone-800 hover:border-stone-700"
              }`}
            >
              {t === "ai" ? "AI Configuration" : t}
            </button>
          ))}
        </div>

        {tab === "team" && (
          <TeamSettingsInline users={users} onAdd={onAddUser} onRemove={onRemoveUser} />
        )}

        {tab === "ai" && (
          <AISettingsInline />
        )}

        {tab === "integrations" && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="rounded-xl bg-stone-950 border border-stone-800 p-3">
              <p className="font-medium text-stone-100 mb-1">Supabase Cloud Sync</p>
              <p className="text-xs text-stone-400">
                Multi-device sync + customer QR ordering need a Supabase project. See the setup
                guide on your Desktop (<code>README-supabase-setup.md</code>). Once keys are added
                to <code>.env</code> the app uses Supabase automatically.
              </p>
            </div>
            <div className="rounded-xl bg-stone-950 border border-stone-800 p-3">
              <p className="font-medium text-stone-100 mb-1">Swiggy / Zomato</p>
              <p className="text-xs text-stone-400">
                Not connected. These platforms require an approved partner API (or middleware like
                UrbanPiper) — not something that can be self-served from here.
              </p>
            </div>
            <div className="rounded-xl bg-stone-950 border border-stone-800 p-3">
              <p className="font-medium text-stone-100 mb-1">Bluetooth Thermal Printer</p>
              <p className="text-xs text-stone-400">
                Direct Bluetooth pairing isn't available in a web app. Use the "Print Receipt"
                button at billing instead.
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
        <div key={u.id} className="flex items-center justify-between rounded-xl bg-stone-950 border border-stone-800 px-3 py-2">
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
          className="rounded-lg bg-stone-950 border border-stone-800 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
        />
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="4-digit PIN"
          className="rounded-lg bg-stone-950 border border-stone-800 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-lg bg-stone-950 border border-stone-800 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
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

function AISettingsInline() {
  const [settings, setSettings] = useState(getAISettings);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const selectedProviderObj = PROVIDERS.find((p) => p.id === settings.provider) || PROVIDERS[0];

  const handleToggle = () => {
    const updated = saveAISettings({ enabled: !settings.enabled });
    setSettings(updated);
  };

  const handleProviderChange = (providerId) => {
    const pObj = PROVIDERS.find((p) => p.id === providerId) || PROVIDERS[0];
    const updated = saveAISettings({ provider: providerId, model: pObj.defaultModel });
    setSettings(updated);
  };

  const handleModelChange = (modelId) => {
    const updated = saveAISettings({ model: modelId });
    setSettings(updated);
  };

  const handleApiKeyChange = (keyVal) => {
    const updated = saveAISettings({ apiKey: keyVal });
    setSettings(updated);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await testAIConnection(settings.provider, settings.apiKey, settings.model);
      setTestResult({ success: true, message: "✓ Connection successful!" });
    } catch (err) {
      setTestResult({ success: false, message: `✕ Connection failed: ${err.message}` });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* Enable Toggle */}
      <div className="flex items-center justify-between bg-stone-950 p-3 rounded-xl border border-stone-800">
        <div>
          <span className="font-bold text-stone-200 block">Enable AI Insights System</span>
          <span className="text-[10px] text-stone-500">AI is 100% optional. POS functions fully if disabled.</span>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer min-h-[36px] ${
            settings.enabled ? "bg-emerald-500 text-stone-950" : "bg-stone-800 text-stone-400"
          }`}
        >
          {settings.enabled ? "Enabled" : "Disabled"}
        </button>
      </div>

      {/* Provider Selector */}
      <div className="flex flex-col gap-1">
        <label className="font-bold text-stone-400 uppercase tracking-wider text-[10px]">AI Provider</label>
        <select
          value={settings.provider}
          onChange={(e) => handleProviderChange(e.target.value)}
          className="rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
        >
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Model Selector */}
      <div className="flex flex-col gap-1">
        <label className="font-bold text-stone-400 uppercase tracking-wider text-[10px]">Model</label>
        <select
          value={settings.model}
          onChange={(e) => handleModelChange(e.target.value)}
          className="rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
        >
          {selectedProviderObj.models.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* API Key Input */}
      <div className="flex flex-col gap-1">
        <label className="font-bold text-stone-400 uppercase tracking-wider text-[10px]">
          {selectedProviderObj.name} API Key
        </label>
        <input
          type="password"
          value={settings.apiKey}
          onChange={(e) => handleApiKeyChange(e.target.value)}
          placeholder={`Enter ${selectedProviderObj.name} API Key...`}
          className="rounded-xl bg-stone-950 border border-stone-800 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
        />
        <span className="text-[10px] text-stone-500">
          ⚠️ Keys entered in browser local storage are accessible to local users. Keep keys private.
        </span>
      </div>

      {/* Test Connection Button */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={testing}
          className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 font-bold text-stone-200 text-xs flex items-center gap-1.5 transition cursor-pointer min-h-[40px]"
        >
          {testing ? <RefreshCw size={14} className="animate-spin" /> : <Bot size={14} />}
          {testing ? "Testing..." : "Test Connection"}
        </button>

        {testResult && (
          <span className={`text-xs font-bold flex items-center gap-1 ${testResult.success ? "text-emerald-400" : "text-rose-400"}`}>
            {testResult.success ? <Check size={14} /> : <AlertCircle size={14} />}
            {testResult.message}
          </span>
        )}
      </div>
    </div>
  );
}
