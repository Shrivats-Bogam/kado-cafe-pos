import { useState, useEffect, useMemo } from "react";
import {
  Settings, Building2, Receipt, Coffee, ChefHat, Menu as MenuIcon, Package,
  Users, ShieldCheck, Bot, Database, AlertTriangle, Save, RefreshCw, Check,
  Download, Trash2, ArrowRight, ShieldAlert, AlertCircle
} from "lucide-react";
import { Card, PrimaryButton, SecondaryButton, Pill } from "../components/ui.jsx";
import { defaultSettings, ROLE_LABELS } from "../data/defaults.js";
import { getAISettings, saveAISettings, PROVIDERS, testAIConnection } from "../lib/ai.js";

const SECTIONS = [
  { id: "general", label: "General & Profile", icon: Building2 },
  { id: "billing", label: "Billing & Tax", icon: Receipt },
  { id: "receipts", label: "Receipts & Print", icon: Receipt },
  { id: "tables", label: "Table Seating", icon: Coffee },
  { id: "kitchen", label: "Kitchen KDS", icon: ChefHat },
  { id: "menu", label: "Menu Preferences", icon: MenuIcon },
  { id: "inventory", label: "Inventory Safety", icon: Package },
  { id: "loyalty", label: "CRM & Loyalty", icon: Users },
  { id: "employees", label: "Team & RBAC", icon: ShieldCheck },
  { id: "ai", label: "AI Configuration", icon: Bot },
  { id: "data", label: "Data & Export", icon: Database },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle, danger: true }
];

export default function SettingsView({ state = {}, dispatch, currentUser, onNavigate }) {
  const currentSettings = useMemo(() => {
    return { ...defaultSettings(), ...(state.settings || {}) };
  }, [state.settings]);

  const [form, setForm] = useState(currentSettings);
  const [activeSection, setActiveSection] = useState("general");
  const [saveStatus, setSaveStatus] = useState(null); // null | "saving" | "saved" | "error"
  const [validationError, setValidationError] = useState("");

  // AI settings local state
  const [aiSettings, setAiSettings] = useState(getAISettings);
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null);

  // Danger zone double-confirm modal
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [resetInput, setResetInput] = useState("");

  // Sync form when state settings update externally
  useEffect(() => {
    setForm({ ...defaultSettings(), ...(state.settings || {}) });
  }, [state.settings]);

  const isOwner = currentUser?.role === "Owner";

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaveStatus(null);
    setValidationError("");
  };

  // Validate settings before save
  const validateForm = () => {
    if (form.loyaltyEarnRate <= 0) return "Loyalty earn rate must be greater than ₹0.";
    if (form.loyaltyRedeemValue <= 0) return "Loyalty redemption value must be greater than ₹0.";
    if (Number(form.goldThreshold) <= Number(form.silverThreshold)) return "Gold tier threshold must be greater than Silver tier.";
    if (Number(form.platinumThreshold) <= Number(form.goldThreshold)) return "Platinum tier threshold must be greater than Gold tier.";
    if (form.gstRate < 0 || form.gstRate > 100) return "GST rate must be between 0% and 100%.";
    return null;
  };

  const handleSave = () => {
    const err = validateForm();
    if (err) {
      setValidationError(err);
      return;
    }

    setSaveStatus("saving");
    try {
      if (dispatch) {
        dispatch("updateSettings", form, currentUser?.name || "Owner");
      }
      saveAISettings(aiSettings);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (e) {
      console.error(e);
      setSaveStatus("error");
    }
  };

  // Export handlers
  const exportCSV = (type) => {
    let data = [];
    let headers = [];
    let filename = `Kado_Cafe_${type}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (type === "customers") {
      headers = ["Customer ID", "Name", "Phone", "Membership", "Points", "Lifetime Spend", "Total Orders"];
      data = (state.customers || []).map((c) => [c.id, c.name, c.phone, c.membership, c.points, c.lifetimeSpend, c.totalOrders]);
    } else if (type === "menu") {
      headers = ["Item ID", "Name", "Category", "Price", "Available"];
      data = (state.menuItems || []).map((m) => [m.id, m.name, m.category, m.price, m.available ? "YES" : "NO"]);
    } else if (type === "inventory") {
      headers = ["Ingredient ID", "Name", "Category", "Unit", "Current Stock", "Min Stock", "Cost Price"];
      data = (state.inventory || []).map((i) => [i.id, i.name, i.category, i.unit, i.currentStock, i.minStock, i.costPrice]);
    } else if (type === "orders") {
      headers = ["Order ID", "Date", "Customer", "Subtotal", "Discount", "GST", "Grand Total", "Status"];
      data = (state.orderHistory || []).map((o) => [o.id, o.paidAt || o.createdAt, o.customerName || "Walk-in", o.subtotal, o.discount, o.gst, o.grandTotal, o.status]);
    }

    if (data.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...data.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTestAI = async () => {
    setAiTesting(true);
    setAiTestResult(null);
    try {
      await testAIConnection(aiSettings.provider, aiSettings.apiKey, aiSettings.model);
      setAiTestResult({ success: true, message: "✓ AI Connection successful!" });
    } catch (err) {
      setAiTestResult({ success: false, message: `✕ Connection failed: ${err.message}` });
    } finally {
      setAiTesting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-stone-100 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900 p-4 rounded-2xl border border-stone-800 shadow-md">
        <div>
          <h2 className="text-xl font-serif font-bold text-stone-50 flex items-center gap-2">
            <Settings className="text-amber-500" size={22} /> Enterprise Settings & Configuration 1.0
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Centralized commercial configuration for receipts, tax, seating defaults, KDS alerts, CRM loyalty, and multi-provider AI
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {validationError && (
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
              <AlertCircle size={14} /> {validationError}
            </span>
          )}

          <PrimaryButton
            onClick={handleSave}
            disabled={saveStatus === "saving" || !isOwner}
            className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs min-h-[44px] px-5 cursor-pointer shadow-md shadow-amber-500/20"
          >
            {saveStatus === "saving" ? (
              <>
                <RefreshCw size={15} className="animate-spin" /> Saving...
              </>
            ) : saveStatus === "saved" ? (
              <>
                <Check size={15} /> Saved Successfully
              </>
            ) : (
              <>
                <Save size={15} /> Save Configuration
              </>
            )}
          </PrimaryButton>
        </div>
      </div>

      {/* Main Settings Section Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Navigation Sidebar */}
        <Card className="lg:col-span-4 p-3 bg-stone-900 border-stone-800 flex flex-col gap-1 shadow-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 px-3 py-1">
            Configuration Sections
          </span>
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                activeSection === sec.id
                  ? sec.danger
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    : "bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/20"
                  : sec.danger
                  ? "text-rose-400 hover:bg-rose-500/10"
                  : "text-stone-300 hover:bg-stone-800"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <sec.icon size={16} /> {sec.label}
              </span>
              <ArrowRight size={14} className="opacity-60" />
            </button>
          ))}
        </Card>

        {/* Form Content Area */}
        <Card className="lg:col-span-8 p-5 bg-stone-900 border-stone-800 flex flex-col gap-5 shadow-md">
          {!isOwner && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-xs text-amber-300 flex items-center gap-2">
              <ShieldAlert size={16} className="shrink-0" />
              <span>You are viewing settings in read-only mode ({currentUser?.role || "Staff"}). Only the Owner can modify configuration.</span>
            </div>
          )}

          {/* Section 1: General & Profile */}
          {activeSection === "general" && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-stone-100 border-b border-stone-800 pb-2 flex items-center gap-2">
                <Building2 size={16} className="text-amber-500" /> General Business Profile
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400 block mb-1 font-semibold">Business Name</label>
                  <input
                    type="text"
                    value={form.businessName}
                    onChange={(e) => handleChange("businessName", e.target.value)}
                    disabled={!isOwner}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-stone-400 block mb-1 font-semibold">Phone Number</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    disabled={!isOwner}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-stone-400 block mb-1 font-semibold">Email Address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    disabled={!isOwner}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-stone-400 block mb-1 font-semibold">GSTIN Registration No.</label>
                  <input
                    type="text"
                    value={form.gstin}
                    onChange={(e) => handleChange("gstin", e.target.value)}
                    disabled={!isOwner}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-400 block mb-1 font-semibold">Physical Address</label>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  disabled={!isOwner}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-stone-800 pt-3">
                <div>
                  <label className="text-stone-400 block mb-1 font-semibold">Currency</label>
                  <input
                    type="text"
                    value={form.currency}
                    onChange={(e) => handleChange("currency", e.target.value)}
                    disabled={!isOwner}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-stone-400 block mb-1 font-semibold">Timezone</label>
                  <input
                    type="text"
                    value={form.timezone}
                    onChange={(e) => handleChange("timezone", e.target.value)}
                    disabled={!isOwner}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-stone-400 block mb-1 font-semibold">Date Format</label>
                  <select
                    value={form.dateFormat}
                    onChange={(e) => handleChange("dateFormat", e.target.value)}
                    disabled={!isOwner}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Billing & Tax */}
          {activeSection === "billing" && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-stone-100 border-b border-stone-800 pb-2 flex items-center gap-2">
                <Receipt size={16} className="text-amber-500" /> Billing & Tax Configuration
              </h3>

              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-[11px] text-amber-300">
                ⚠️ Changing tax rates or billing settings applies only to <strong>future transactions</strong>. Historical bills remain unchanged.
              </div>

              <div className="flex items-center justify-between bg-stone-950 p-3 rounded-xl border border-stone-800">
                <div>
                  <span className="font-bold text-stone-200 block">Enable GST Calculation</span>
                  <span className="text-[10px] text-stone-500">Automatically adds GST percentage to total bill</span>
                </div>
                <input
                  type="checkbox"
                  checked={form.gstEnabled}
                  onChange={(e) => handleChange("gstEnabled", e.target.checked)}
                  disabled={!isOwner}
                  className="w-4 h-4 accent-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400 block mb-1 font-semibold">GST Rate (%)</label>
                  <input
                    type="number"
                    value={form.gstRate}
                    onChange={(e) => handleChange("gstRate", Number(e.target.value))}
                    disabled={!isOwner || !form.gstEnabled}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-stone-400 block mb-1 font-semibold">Rounding Method</label>
                  <select
                    value={form.roundingMethod}
                    onChange={(e) => handleChange("roundingMethod", e.target.value)}
                    disabled={!isOwner}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="round">Standard Round (nearest ₹1)</option>
                    <option value="floor">Floor (round down)</option>
                    <option value="ceil">Ceil (round up)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Receipts & Thermal Print */}
          {activeSection === "receipts" && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-stone-100 border-b border-stone-800 pb-2 flex items-center gap-2">
                <Receipt size={16} className="text-amber-500" /> Receipt & Thermal Printing
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400 block mb-1 font-semibold">Thermal Paper Width</label>
                  <select
                    value={form.receiptWidth}
                    onChange={(e) => handleChange("receiptWidth", e.target.value)}
                    disabled={!isOwner}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-mono"
                  >
                    <option value="80mm">80mm Standard POS Printer</option>
                    <option value="58mm">58mm Compact Mobile Printer</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 bg-stone-950 p-2.5 rounded-xl border border-stone-800 text-stone-300">
                    <input
                      type="checkbox"
                      checked={form.autoPrintAfterPayment}
                      onChange={(e) => handleChange("autoPrintAfterPayment", e.target.checked)}
                      disabled={!isOwner}
                      className="w-4 h-4 accent-amber-500"
                    />
                    <span>Auto-trigger print after payment success</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-stone-400 block mb-1 font-semibold">Receipt Footer Message</label>
                <input
                  type="text"
                  value={form.receiptFooter}
                  onChange={(e) => handleChange("receiptFooter", e.target.value)}
                  disabled={!isOwner}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* Section 4: Table Configuration */}
          {activeSection === "tables" && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-stone-100 border-b border-stone-800 pb-2 flex items-center gap-2">
                <Coffee size={16} className="text-amber-500" /> Table & Seating Defaults
              </h3>

              <div>
                <label className="text-stone-400 block mb-1 font-semibold">Default Seating Capacity for New Tables</label>
                <select
                  value={form.defaultTableCapacity}
                  onChange={(e) => handleChange("defaultTableCapacity", Number(e.target.value))}
                  disabled={!isOwner}
                  className="w-full sm:w-1/2 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value={2}>2 Persons (Small)</option>
                  <option value={4}>4 Persons (Medium)</option>
                  <option value={6}>6 Persons (Large Family)</option>
                  <option value={8}>8 Persons (Group Table)</option>
                </select>
                <span className="text-[10px] text-stone-500 block mt-1">
                  Changing default capacity applies to newly added tables only. Existing tables are preserved.
                </span>
              </div>
            </div>
          )}

          {/* Section 5: Kitchen KDS */}
          {activeSection === "kitchen" && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-stone-100 border-b border-stone-800 pb-2 flex items-center gap-2">
                <ChefHat size={16} className="text-amber-500" /> Kitchen Display System (KDS)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400 block mb-1 font-semibold">Attention Alert Threshold (Minutes)</label>
                  <input
                    type="number"
                    value={form.attentionThresholdMins}
                    onChange={(e) => handleChange("attentionThresholdMins", Number(e.target.value))}
                    disabled={!isOwner}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-stone-400 block mb-1 font-semibold">Urgent Alert Threshold (Minutes)</label>
                  <input
                    type="number"
                    value={form.urgentThresholdMins}
                    onChange={(e) => handleChange("urgentThresholdMins", Number(e.target.value))}
                    disabled={!isOwner}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 6: CRM & Loyalty Rules */}
          {activeSection === "loyalty" && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-stone-100 border-b border-stone-800 pb-2 flex items-center gap-2">
                <Users size={16} className="text-amber-500" /> CRM & Loyalty Program Rules
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400 block mb-1 font-semibold">Loyalty Earn Rate (Spend ₹ for 1 Point)</label>
                  <input
                    type="number"
                    value={form.loyaltyEarnRate}
                    onChange={(e) => handleChange("loyaltyEarnRate", Number(e.target.value))}
                    disabled={!isOwner}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <span className="text-[10px] text-stone-500 block mt-0.5">Example: ₹20 spend = 1 point earned</span>
                </div>

                <div>
                  <label className="text-stone-400 block mb-1 font-semibold">Redemption Value (₹ per Point)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.loyaltyRedeemValue}
                    onChange={(e) => handleChange("loyaltyRedeemValue", Number(e.target.value))}
                    disabled={!isOwner}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <span className="text-[10px] text-stone-500 block mt-0.5">Example: 0.50 means 100 points = ₹50 discount</span>
                </div>
              </div>

              <div className="border-t border-stone-800 pt-3">
                <label className="text-stone-400 block mb-2 font-semibold">Membership Tier Spend Thresholds (Lifetime Spend ₹)</label>
                <div className="grid grid-cols-3 gap-2 font-mono">
                  <div>
                    <span className="text-[10px] text-stone-500 block">Silver Tier</span>
                    <input
                      type="number"
                      value={form.silverThreshold}
                      disabled
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-1.5 text-stone-400 text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-400 block">Gold Tier</span>
                    <input
                      type="number"
                      value={form.goldThreshold}
                      onChange={(e) => handleChange("goldThreshold", Number(e.target.value))}
                      disabled={!isOwner}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-1.5 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-purple-400 block">Platinum Tier</span>
                    <input
                      type="number"
                      value={form.platinumThreshold}
                      onChange={(e) => handleChange("platinumThreshold", Number(e.target.value))}
                      disabled={!isOwner}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-1.5 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 7: Employees & RBAC */}
          {activeSection === "employees" && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-stone-100 border-b border-stone-800 pb-2 flex items-center gap-2">
                <ShieldCheck size={16} className="text-amber-500" /> Team Members & Role Permissions
              </h3>

              <p className="text-stone-300">
                Staff app login PINs, staff shifts, and role-based tab access permissions are managed in the central <strong>Employees module</strong>.
              </p>

              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate("employees")}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer min-h-[40px]"
                >
                  Open Team & Employees Center <ArrowRight size={14} />
                </button>
              )}
            </div>
          )}

          {/* Section 8: AI Configuration */}
          {activeSection === "ai" && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-stone-100 border-b border-stone-800 pb-2 flex items-center gap-2">
                <Bot size={16} className="text-amber-500" /> Multi-Provider AI Configuration
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400 block mb-1 font-semibold">Active AI Provider</label>
                  <select
                    value={aiSettings.provider}
                    onChange={(e) => {
                      const pObj = PROVIDERS.find((p) => p.id === e.target.value) || PROVIDERS[0];
                      const next = saveAISettings({ provider: e.target.value, model: pObj.defaultModel });
                      setAiSettings(next);
                    }}
                    disabled={!isOwner}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                  >
                    {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-stone-400 block mb-1 font-semibold">Model Identifier</label>
                  <select
                    value={aiSettings.model}
                    onChange={(e) => setAiSettings(saveAISettings({ model: e.target.value }))}
                    disabled={!isOwner}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-mono"
                  >
                    {(PROVIDERS.find((p) => p.id === aiSettings.provider)?.models || []).map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-stone-400 block mb-1 font-semibold">API Secret Key</label>
                <input
                  type="password"
                  value={aiSettings.apiKey}
                  onChange={(e) => setAiSettings(saveAISettings({ apiKey: e.target.value }))}
                  placeholder="Enter secret API key..."
                  disabled={!isOwner}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestAI}
                  disabled={aiTesting}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 font-bold text-stone-200 text-xs flex items-center gap-1.5 transition cursor-pointer min-h-[40px]"
                >
                  {aiTesting ? <RefreshCw size={14} className="animate-spin" /> : <Bot size={14} />}
                  {aiTesting ? "Testing..." : "Test Connection"}
                </button>

                {aiTestResult && (
                  <span className={`text-xs font-bold flex items-center gap-1 ${aiTestResult.success ? "text-emerald-400" : "text-rose-400"}`}>
                    {aiTestResult.message}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Section 9: Data & Export */}
          {activeSection === "data" && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-stone-100 border-b border-stone-800 pb-2 flex items-center gap-2">
                <Database size={16} className="text-amber-500" /> Data Portability & CSV Exporters
              </h3>

              <p className="text-stone-300">
                Export clean CSV accounting data files for external reporting, bookkeeping, and inventory audits.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => exportCSV("orders")}
                  className="p-3 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-500/50 flex flex-col items-center gap-1 text-center font-bold text-stone-200 transition cursor-pointer"
                >
                  <Download size={16} className="text-amber-500" /> Export Orders
                </button>

                <button
                  type="button"
                  onClick={() => exportCSV("customers")}
                  className="p-3 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-500/50 flex flex-col items-center gap-1 text-center font-bold text-stone-200 transition cursor-pointer"
                >
                  <Download size={16} className="text-purple-400" /> Export Customers
                </button>

                <button
                  type="button"
                  onClick={() => exportCSV("menu")}
                  className="p-3 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-500/50 flex flex-col items-center gap-1 text-center font-bold text-stone-200 transition cursor-pointer"
                >
                  <Download size={16} className="text-emerald-400" /> Export Menu
                </button>

                <button
                  type="button"
                  onClick={() => exportCSV("inventory")}
                  className="p-3 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-500/50 flex flex-col items-center gap-1 text-center font-bold text-stone-200 transition cursor-pointer"
                >
                  <Download size={16} className="text-sky-400" /> Export Inventory
                </button>
              </div>
            </div>
          )}

          {/* Section 10: Danger Zone */}
          {activeSection === "danger" && (
            <div className="space-y-4 text-xs border border-rose-500/30 p-4 rounded-2xl bg-rose-500/5">
              <h3 className="text-sm font-bold text-rose-400 border-b border-rose-500/30 pb-2 flex items-center gap-2">
                <AlertTriangle size={16} /> Danger Zone — Destructive Operations
              </h3>

              <p className="text-stone-300">
                High-risk reset operations. Requires explicit double-confirmation before execution.
              </p>

              {isOwner ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowConfirmReset(true)}
                    className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-stone-50 font-bold text-xs flex items-center gap-2 transition cursor-pointer min-h-[40px]"
                  >
                    <Trash2 size={15} /> Reset Demo Activity Logs
                  </button>
                </div>
              ) : (
                <span className="text-rose-400 font-bold">Only the Owner can access Danger Zone reset actions.</span>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Double Confirmation Modal for Danger Zone */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-5 bg-stone-900 border-rose-500/40 flex flex-col gap-4 text-xs">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <AlertTriangle size={18} /> Are you absolutely sure?
            </h3>
            <p className="text-stone-300">
              Type <strong className="text-rose-400 font-mono">RESET LOGS</strong> below to confirm resetting demo activity logs.
            </p>
            <input
              type="text"
              value={resetInput}
              onChange={(e) => setResetInput(e.target.value)}
              placeholder="Type RESET LOGS..."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-mono focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <SecondaryButton onClick={() => { setShowConfirmReset(false); setResetInput(""); }}>
                Cancel
              </SecondaryButton>
              <button
                type="button"
                disabled={resetInput !== "RESET LOGS"}
                onClick={() => {
                  if (dispatch) {
                    dispatch("updateSettings", { activityLogs: [] }, currentUser?.name || "Owner");
                  }
                  setShowConfirmReset(false);
                  setResetInput("");
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 disabled:opacity-40 text-stone-50 font-bold text-xs cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
