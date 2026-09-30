import { useState, useEffect, useMemo } from "react";
import {
  Settings, Building2, Receipt, Coffee, ChefHat, Menu as MenuIcon, Package,
  Users, ShieldCheck, Bot, Database, AlertTriangle, Save, RefreshCw, Check,
  Download, Trash2, ArrowRight, ShieldAlert, AlertCircle, Archive,
  Printer, Usb, Bluetooth, Zap, Scissors, Volume2
} from "lucide-react";
import { Card, PrimaryButton, SecondaryButton, Pill } from "../components/ui.jsx";
import { useToaster } from "../components/Toaster.jsx";
import { defaultSettings, ROLE_LABELS } from "../data/defaults.js";
import { hardwarePrinter } from "../lib/hardwarePrinter.js";
import { getAISettings, saveAISettings, PROVIDERS, testAIConnection } from "../lib/ai.js";
import {
  buildBackupPayload,
  validateBackupPayload,
  createPreRestoreSnapshot,
  getSafetySnapshots,
  verifyRestoredState
} from "../lib/backupEngine.js";

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
  const toaster = useToaster();

  // AI settings local state
  const [aiSettings, setAiSettings] = useState(getAISettings);
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null);

  // Danger zone double-confirm modal
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [resetInput, setResetInput] = useState("");

  // Restore Modal State
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restorePayload, setRestorePayload] = useState(null);
  const [restoreValidation, setRestoreValidation] = useState(null);
  const [restoreInput, setRestoreInput] = useState("");
  const [restoreError, setRestoreError] = useState("");

  // Hardware thermal printer state
  const [printerStatus, setPrinterStatus] = useState(() => hardwarePrinter.getStatus());
  const [printerConnecting, setPrinterConnecting] = useState(false);
  const [printerActionMsg, setPrinterActionMsg] = useState("");

  useEffect(() => {
    return hardwarePrinter.subscribe((status) => {
      setPrinterStatus(status);
    });
  }, []);

  const handleConnectHardware = async (type) => {
    setPrinterConnecting(true);
    setPrinterActionMsg("");
    try {
      if (type === "webusb") {
        await hardwarePrinter.connectUSB();
        setPrinterActionMsg("Direct USB Thermal Printer Connected!");
      } else if (type === "webserial") {
        await hardwarePrinter.connectSerial(form.printerBaudRate || 9600);
        setPrinterActionMsg("Serial COM Thermal Printer Connected!");
      } else if (type === "webbluetooth") {
        await hardwarePrinter.connectBluetooth();
        setPrinterActionMsg("Bluetooth Thermal Printer Connected!");
      }
    } catch (err) {
      setPrinterActionMsg(`Connection failed: ${err.message}`);
    } finally {
      setPrinterConnecting(false);
    }
  };

  const handleDisconnectHardware = async () => {
    await hardwarePrinter.disconnect();
    setPrinterActionMsg("Printer disconnected (reverted to browser print).");
  };

  const handleTestPrint = async () => {
    setPrinterActionMsg("Sending test print...");
    try {
      await hardwarePrinter.printTestReceipt(form);
      setPrinterActionMsg("Test print command sent successfully!");
    } catch (err) {
      setPrinterActionMsg(`Test print error: ${err.message}`);
    }
  };

  const handleTestDrawer = async () => {
    setPrinterActionMsg("Pulsing cash drawer...");
    try {
      await hardwarePrinter.kickCashDrawer();
      setPrinterActionMsg("Cash drawer kick pulse sent!");
    } catch (err) {
      setPrinterActionMsg(`Drawer pulse error: ${err.message}`);
    }
  };

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

  const handleOptimizeState = () => {
    const ordersCount = (state.orderHistory || []).length;
    const logsCount = (state.inventoryLogs || []).length;
    if (ordersCount <= 200 && logsCount <= 200) {
      toaster.push("State is already lean and optimized (< 200 orders in memory).", "info");
      return;
    }
    const olderOrders = (state.orderHistory || []).slice(200);
    if (typeof localStorage !== "undefined" && olderOrders.length > 0) {
      try {
        const existingArchive = JSON.parse(localStorage.getItem("kado-cafe-archive") || "[]");
        localStorage.setItem("kado-cafe-archive", JSON.stringify([...olderOrders, ...existingArchive].slice(0, 5000)));
      } catch (err) {
        console.warn("Failed to archive older orders:", err);
      }
    }
    if (dispatch) {
      dispatch("archiveHistoricalData", { keepOrders: 200, keepLogs: 200, keepActivity: 50 });
      toaster.push(`Database optimized! Archived ${ordersCount - 200} older orders. Realtime payload minimized.`, "success");
    }
  };

  const handleExportArchive = () => {
    let archiveData = [];
    if (typeof localStorage !== "undefined") {
      try {
        archiveData = JSON.parse(localStorage.getItem("kado-cafe-archive") || "[]");
      } catch { /* empty */ }
    }
    if (archiveData.length === 0) {
      toaster.push("No archived historical orders found in local storage.", "info");
      return;
    }
    const blob = new Blob([JSON.stringify(archiveData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `kado-cafe-archived-orders-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toaster.push(`Exported ${archiveData.length} archived orders.`, "success");
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
            data-testid="settings-save-btn"
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
                <Save size={15} /> Save Changes
              </>
            )}
          </PrimaryButton>
        </div>
      </div>

      {/* Main Settings Section Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Navigation Sidebar */}
        <Card className="lg:col-span-4 p-3 bg-stone-900 border-stone-800 flex flex-col gap-1.5 shadow-md">
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              data-testid={`settings-nav-${sec.id}`}
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

          {/* Section 3: Hardware Connectivity & Thermal Printing */}
          {activeSection === "receipts" && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-stone-100 border-b border-stone-800 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Printer size={16} className="text-amber-500" /> Hardware Connectivity & Thermal Printing
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  printerStatus.isDirectHardware 
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" 
                    : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                }`}>
                  {printerStatus.isDirectHardware ? "⚡ Direct Hardware Connected" : "🖨️ Ready (Browser Engine)"}
                </span>
              </h3>

              {/* Status & Active Device Banner */}
              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block">Active Output Pipeline</span>
                  <span className="text-stone-200 font-bold text-sm flex items-center gap-1.5 mt-0.5">
                    {printerStatus.deviceName}
                  </span>
                  <span className="text-[11px] text-stone-400 block mt-0.5">
                    {printerStatus.isDirectHardware 
                      ? "High-speed raw ESC/POS binary bytecode (<30ms latency, zero browser print popups)"
                      : "Standard OS thermal printing via browser print pipeline with auto-formatting"}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleTestPrint}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Receipt size={14} className="text-amber-400" /> Test Print
                  </button>
                  <button
                    type="button"
                    onClick={handleTestDrawer}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Zap size={14} className="text-emerald-400" /> Kick Drawer
                  </button>
                </div>
              </div>

              {printerActionMsg && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-mono">
                  {printerActionMsg}
                </div>
              )}

              {/* Hardware Pairing Controls */}
              <div className="p-3 bg-stone-900/60 rounded-xl border border-stone-800 space-y-3">
                <span className="text-stone-400 font-semibold block">Direct Hardware Pairing (No-Dialog Ultra-Fast Printing)</span>
                
                {printerStatus.isDirectHardware ? (
                  <div className="flex items-center justify-between">
                    <span className="text-stone-300">
                      Printer actively linked to <strong>{printerStatus.deviceName}</strong>.
                    </span>
                    <button
                      type="button"
                      onClick={handleDisconnectHardware}
                      disabled={!isOwner}
                      className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 rounded-lg font-semibold text-xs transition cursor-pointer"
                    >
                      Disconnect Device
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleConnectHardware("webusb")}
                      disabled={!isOwner || printerConnecting}
                      className="p-3 bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/50 rounded-xl text-left transition cursor-pointer flex flex-col gap-1"
                    >
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                        <Usb size={15} /> Direct WebUSB
                      </div>
                      <span className="text-[11px] text-stone-400">Epson, TVS, POS-80 via USB cable (&lt;30ms instant print)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleConnectHardware("webserial")}
                      disabled={!isOwner || printerConnecting}
                      className="p-3 bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/50 rounded-xl text-left transition cursor-pointer flex flex-col gap-1"
                    >
                      <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                        <Zap size={15} /> Serial / COM Port
                      </div>
                      <span className="text-[11px] text-stone-400">RS-232 & USB-to-UART serial adapters (9600/19200 baud)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleConnectHardware("webbluetooth")}
                      disabled={!isOwner || printerConnecting}
                      className="p-3 bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/50 rounded-xl text-left transition cursor-pointer flex flex-col gap-1"
                    >
                      <div className="flex items-center gap-1.5 text-purple-400 font-bold">
                        <Bluetooth size={15} /> Wireless Bluetooth
                      </div>
                      <span className="text-[11px] text-stone-400">Portable belt & tablet 58mm mini printers</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Hardware Preferences & Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400 block mb-1 font-semibold">Thermal Paper Width</label>
                  <select
                    value={form.receiptWidth}
                    onChange={(e) => handleChange("receiptWidth", e.target.value)}
                    disabled={!isOwner}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-mono"
                  >
                    <option value="80mm">80mm Standard POS Printer (48 Chars/Line)</option>
                    <option value="58mm">58mm Compact Mobile Printer (32 Chars/Line)</option>
                  </select>
                </div>

                <div>
                  <label className="text-stone-400 block mb-1 font-semibold">Serial COM Baud Rate</label>
                  <select
                    value={form.printerBaudRate || 9600}
                    onChange={(e) => handleChange("printerBaudRate", Number(e.target.value))}
                    disabled={!isOwner}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-mono"
                  >
                    <option value={9600}>9600 bps (Standard Thermal)</option>
                    <option value={19200}>19200 bps (High Speed)</option>
                    <option value={38400}>38400 bps</option>
                    <option value={115200}>115200 bps (Ultra High Speed)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2.5 bg-stone-950 p-2.5 rounded-xl border border-stone-800 text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.kickDrawerOnCash ?? true}
                    onChange={(e) => handleChange("kickDrawerOnCash", e.target.checked)}
                    disabled={!isOwner}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span>Auto-kick RJ11 Cash Drawer on Cash settlement</span>
                </label>

                <label className="flex items-center gap-2.5 bg-stone-950 p-2.5 rounded-xl border border-stone-800 text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.autoCutPaper ?? true}
                    onChange={(e) => handleChange("autoCutPaper", e.target.checked)}
                    disabled={!isOwner}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span>Send hardware guillotine paper cut command</span>
                </label>

                <label className="flex items-center gap-2.5 bg-stone-950 p-2.5 rounded-xl border border-stone-800 text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.buzzerOnKOT ?? true}
                    onChange={(e) => handleChange("buzzerOnKOT", e.target.checked)}
                    disabled={!isOwner}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span>Audible buzzer beep on Kitchen Order Tickets</span>
                </label>

                <label className="flex items-center gap-2.5 bg-stone-950 p-2.5 rounded-xl border border-stone-800 text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.autoPrintAfterPayment ?? false}
                    onChange={(e) => handleChange("autoPrintAfterPayment", e.target.checked)}
                    disabled={!isOwner}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span>Auto-print receipt immediately upon payment</span>
                </label>
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

              {/* Silent Kiosk Printing Tip */}
              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-stone-400 space-y-1">
                <span className="text-amber-400 font-bold block flex items-center gap-1.5">
                  💡 Zero-Dialog Silent Kiosk Printing for Windows POS Terminals
                </span>
                <p className="text-[11px] leading-relaxed">
                  If using a standard Windows printer driver, you can completely bypass the browser print dialog by starting Chrome/Edge in Kiosk mode:
                </p>
                <code className="block bg-stone-900 px-3 py-1.5 rounded-lg text-stone-200 font-mono text-[10px]">
                  chrome.exe --kiosk --kiosk-printing http://localhost:5173
                </code>
                <p className="text-[10px] text-stone-500">
                  This sends all print commands immediately to your default thermal printer with zero popup prompts.
                </p>
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

          {/* Section: Menu Preferences */}
          {activeSection === "menu" && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-stone-100 border-b border-stone-800 pb-2 flex items-center gap-2">
                <MenuIcon size={16} className="text-amber-500" /> Menu Preferences & Display Rules
              </h3>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-stone-300 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.showUnavailableItemsToStaff !== false}
                    onChange={(e) => handleChange("showUnavailableItemsToStaff", e.target.checked)}
                    disabled={!isOwner}
                    className="accent-amber-500 rounded"
                  />
                  <span>Show 86'd / Unavailable Items in Staff Order Screen (Greyed out)</span>
                </label>

                <label className="flex items-center gap-2 text-stone-300 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.showUnavailableItemsToCustomers === true}
                    onChange={(e) => handleChange("showUnavailableItemsToCustomers", e.target.checked)}
                    disabled={!isOwner}
                    className="accent-amber-500 rounded"
                  />
                  <span>Show Unavailable Items in QR Customer Menu</span>
                </label>

                <div>
                  <label className="text-stone-400 block mb-1 font-semibold">Default Menu Category</label>
                  <input
                    type="text"
                    value={form.defaultMenuCategory || "All"}
                    onChange={(e) => handleChange("defaultMenuCategory", e.target.value)}
                    disabled={!isOwner}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section: Inventory Safety */}
          {activeSection === "inventory" && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-stone-100 border-b border-stone-800 pb-2 flex items-center gap-2">
                <Package size={16} className="text-amber-500" /> Inventory Safety & Auto-Deduction Rules
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400 block mb-1 font-semibold">Default Minimum Stock Warning Threshold</label>
                  <input
                    type="number"
                    value={form.defaultMinStockThreshold || 5}
                    onChange={(e) => handleChange("defaultMinStockThreshold", Number(e.target.value))}
                    disabled={!isOwner}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-stone-300 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.stockWarningNotify !== false}
                      onChange={(e) => handleChange("stockWarningNotify", e.target.checked)}
                      disabled={!isOwner}
                      className="accent-amber-500 rounded"
                    />
                    <span>Show Low Stock Banner Alerts on Dashboard</span>
                  </label>
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

              {/* Loyalty Points Expiry & Auto-Promotion Policy */}
              <div className="border-t border-stone-800 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-stone-400 font-semibold">Loyalty Points Expiry Policy</label>
                  <label className="flex items-center gap-2 cursor-pointer text-stone-300">
                    <input
                      type="checkbox"
                      checked={form.loyaltyPointsExpiryEnabled ?? true}
                      onChange={(e) => handleChange("loyaltyPointsExpiryEnabled", e.target.checked)}
                      disabled={!isOwner}
                      className="rounded accent-amber-500 cursor-pointer"
                    />
                    <span>Auto-Expire Stale Points</span>
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="text-stone-400 block mb-1">Inactivity Expiry Window (Days)</label>
                    <input
                      type="number"
                      value={form.loyaltyPointsExpiryDays ?? 365}
                      onChange={(e) => handleChange("loyaltyPointsExpiryDays", Number(e.target.value))}
                      disabled={!isOwner || form.loyaltyPointsExpiryEnabled === false}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-mono disabled:opacity-50"
                    />
                    <span className="text-[10px] text-stone-500 block mt-0.5">Points expire if customer has no visits for this period (Default: 365 days)</span>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        if (dispatch) {
                          dispatch("recalculateCustomerLoyalty", { staffName: currentUser?.name });
                          setSuccessMsg("Loyalty audit executed: Customer tiers promoted & inactive points expired.");
                          setTimeout(() => setSuccessMsg(""), 3500);
                        }
                      }}
                      disabled={!isOwner}
                      className="w-full py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 min-h-[38px]"
                    >
                      <RefreshCw size={13} /> Run Tier Auto-Promotion & Audit
                    </button>
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

          {/* Section 9: Data & Export & Recovery */}
          {activeSection === "data" && (
            <div className="space-y-6 text-xs">
              <h3 className="text-sm font-bold text-stone-100 border-b border-stone-800 pb-2 flex items-center gap-2">
                <Database size={16} className="text-amber-500" /> Data Portability & Disaster Recovery Center
              </h3>

              {/* Backup Preview Summary */}
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-200 uppercase tracking-wide">Live Backup Status & Scope</span>
                  <Pill tone="emerald">Ready for Export</Pill>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                    <span className="text-stone-500 block">Orders / Bills</span>
                    <strong className="text-stone-100 text-sm">{(state.orderHistory || []).length}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                    <span className="text-stone-500 block">Customers</span>
                    <strong className="text-stone-100 text-sm">{(state.customers || []).length}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                    <span className="text-stone-500 block">Menu Items</span>
                    <strong className="text-stone-100 text-sm">{(state.menuItems || []).length}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                    <span className="text-stone-500 block">Inventory Stock</span>
                    <strong className="text-stone-100 text-sm">{(state.inventory || []).length}</strong>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-800/60">
                  <PrimaryButton
                    data-testid="export-backup-btn"
                    disabled={!isOwner}
                    onClick={() => {
                      const payload = buildBackupPayload(state);
                      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
                      a.href = url;
                      a.download = `kado-cafe-backup-${dateStr}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download size={15} /> Export Full JSON Backup
                  </PrimaryButton>

                  <SecondaryButton
                    data-testid="restore-backup-btn"
                    disabled={!isOwner}
                    onClick={() => setShowRestoreModal(true)}
                  >
                    <RefreshCw size={15} className="text-amber-500" /> Restore Backup
                  </SecondaryButton>
                </div>
              </div>

              {/* Database Optimization & Realtime Payload Archival */}
              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Archive size={16} className="text-amber-500" />
                    <span className="font-bold text-stone-200 uppercase tracking-wide">Realtime Payload Optimization & Archival</span>
                  </div>
                  <Pill tone={(state.orderHistory || []).length > 250 ? "amber" : "emerald"}>
                    {(state.orderHistory || []).length > 250 ? "Optimization Recommended" : "Optimal Payload"}
                  </Pill>
                </div>
                <p className="text-[11px] text-stone-400">
                  Automatically bounds in-memory orders and audit logs to keep Supabase realtime broadcasts nimble (&lt;150KB) and prevent terminal memory bloat over months of continuous operation.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                    <span className="text-stone-500 block">Orders in Memory</span>
                    <strong className="text-stone-100 text-sm">{(state.orderHistory || []).length}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                    <span className="text-stone-500 block">Archived Orders</span>
                    <strong className="text-amber-400 text-sm">{state.archivedOrdersCount || 0}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                    <span className="text-stone-500 block">Inventory Logs</span>
                    <strong className="text-stone-100 text-sm">{(state.inventoryLogs || []).length}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                    <span className="text-stone-500 block">Last Archived</span>
                    <strong className="text-stone-300 text-xs">
                      {state.lastArchivedAt ? new Date(state.lastArchivedAt).toLocaleDateString() : "Never"}
                    </strong>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-800/60">
                  <PrimaryButton
                    data-testid="optimize-db-btn"
                    disabled={!isOwner}
                    onClick={handleOptimizeState}
                  >
                    <Archive size={15} /> Optimize & Archive Database
                  </PrimaryButton>
                  <SecondaryButton
                    data-testid="export-archive-btn"
                    onClick={handleExportArchive}
                  >
                    <Download size={15} /> Export Archived Orders (.JSON)
                  </SecondaryButton>
                </div>
              </div>

              {/* Safety Snapshots */}
              <div className="space-y-2">
                <span className="font-bold text-stone-300 block">Pre-Restore Safety Snapshots (Local Retention)</span>
                {getSafetySnapshots().length === 0 ? (
                  <span className="text-stone-500 block italic">No pre-restore safety snapshots created yet.</span>
                ) : (
                  <div className="space-y-1.5">
                    {getSafetySnapshots().map((s, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between text-[11px]">
                        <div>
                          <strong className="text-stone-200 block">{s.key}</strong>
                          <span className="text-stone-500">{new Date(s.timestamp).toLocaleString()} • {s.ordersCount} Orders • {s.customersCount} Customers</span>
                        </div>
                        <SecondaryButton
                          disabled={!isOwner}
                          onClick={() => {
                            const raw = localStorage.getItem(s.key);
                            if (raw && dispatch) {
                              const parsed = JSON.parse(raw);
                              createPreRestoreSnapshot(state);
                              dispatch("restoreBackup", parsed, currentUser?.name || "Owner");
                              if (typeof window !== "undefined") window.dispatchEvent(new Event("storage"));
                            }
                          }}
                        >
                          Restore Snapshot
                        </SecondaryButton>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CSV Exporters */}
              <div className="space-y-2 pt-3 border-t border-stone-800">
                <span className="font-bold text-stone-300 block">CSV Data Exporters</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => exportCSV("orders")}
                    className="p-3 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-500/50 flex flex-col items-center gap-1 text-center font-bold text-stone-200 transition cursor-pointer"
                  >
                    <Download size={16} className="text-amber-500" /> Export Orders CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => exportCSV("customers")}
                    className="p-3 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-500/50 flex flex-col items-center gap-1 text-center font-bold text-stone-200 transition cursor-pointer"
                  >
                    <Download size={16} className="text-purple-400" /> Export Customers CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => exportCSV("menu")}
                    className="p-3 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-500/50 flex flex-col items-center gap-1 text-center font-bold text-stone-200 transition cursor-pointer"
                  >
                    <Download size={16} className="text-emerald-400" /> Export Menu CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => exportCSV("inventory")}
                    className="p-3 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-500/50 flex flex-col items-center gap-1 text-center font-bold text-stone-200 transition cursor-pointer"
                  >
                    <Download size={16} className="text-sky-400" /> Export Inventory CSV
                  </button>
                </div>
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

      {/* Multi-Step Owner Backup Restore Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-5 bg-stone-900 border-amber-500/40 flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <RefreshCw size={18} /> Restore Café Data Backup
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowRestoreModal(false);
                  setRestorePayload(null);
                  setRestoreValidation(null);
                  setRestoreInput("");
                  setRestoreError("");
                }}
                className="text-stone-400 hover:text-stone-200"
              >
                ✕
              </button>
            </div>

            {/* Step 1: File Selection */}
            {!restorePayload && (
              <div className="space-y-3">
                <p className="text-stone-300">
                  Select a valid Kado Cafe JSON backup file (`.json`) exported previously by the Owner.
                </p>

                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setRestoreError("");
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      try {
                        const parsed = JSON.parse(evt.target.result);
                        const validation = validateBackupPayload(parsed);
                        setRestorePayload(parsed);
                        setRestoreValidation(validation);
                        if (!validation.valid) {
                          setRestoreError(validation.errors.join(" "));
                        }
                      } catch (err) {
                        setRestoreError("Failed to parse JSON file. File may be corrupted.");
                      }
                    };
                    reader.readAsText(file);
                  }}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-300 text-xs focus:outline-none"
                />

                {restoreError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2">
                    <AlertCircle size={16} /> {restoreError}
                  </div>
                )}
              </div>
            )}

            {/* Step 2 & 3: Validation & Comparison Preview */}
            {restorePayload && restoreValidation && (
              <div className="space-y-4">
                {!restoreValidation.valid ? (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 space-y-1">
                    <strong className="block font-bold">Validation Failed:</strong>
                    {restoreValidation.errors.map((err, i) => (
                      <p key={i}>• {err}</p>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-2">
                      <Check size={16} /> Backup validated successfully! Checksum & structural integrity verified.
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-1">
                        <strong className="text-stone-400 block border-b border-stone-800 pb-1">CURRENT LIVE STATE</strong>
                        <div>Orders: <strong>{(state.orderHistory || []).length}</strong></div>
                        <div>Customers: <strong>{(state.customers || []).length}</strong></div>
                        <div>Menu Items: <strong>{(state.menuItems || []).length}</strong></div>
                        <div>Inventory: <strong>{(state.inventory || []).length}</strong></div>
                      </div>

                      <div className="p-3 rounded-xl bg-stone-950 border border-amber-500/30 space-y-1">
                        <strong className="text-amber-400 block border-b border-stone-800 pb-1">BACKUP DATA TO RESTORE</strong>
                        <div>Orders: <strong>{restoreValidation.summary.ordersCount}</strong></div>
                        <div>Customers: <strong>{restoreValidation.summary.customersCount}</strong></div>
                        <div>Menu Items: <strong>{restoreValidation.summary.menuItemsCount}</strong></div>
                        <div>Inventory: <strong>{restoreValidation.summary.inventoryCount}</strong></div>
                      </div>
                    </div>

                    <p className="text-amber-300 font-semibold bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/30">
                      ⚠️ Restoring will replace current live state. An automatic <strong>Pre-Restore Safety Snapshot</strong> will be saved before restore.
                    </p>

                    <div>
                      <label className="text-stone-300 block mb-1 font-semibold">
                        Type <strong className="text-amber-400 font-mono">RESTORE DATA</strong> to confirm:
                      </label>
                      <input
                        type="text"
                        value={restoreInput}
                        onChange={(e) => setRestoreInput(e.target.value)}
                        placeholder="Type RESTORE DATA..."
                        className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
                  <SecondaryButton
                    onClick={() => {
                      setRestorePayload(null);
                      setRestoreValidation(null);
                      setRestoreInput("");
                      setRestoreError("");
                    }}
                  >
                    Select Different File
                  </SecondaryButton>

                  {restoreValidation.valid && (
                    <button
                      type="button"
                      disabled={restoreInput !== "RESTORE DATA"}
                      onClick={() => {
                        if (dispatch) {
                          // 1. Create Safety Snapshot
                          createPreRestoreSnapshot(state);

                          // 2. Dispatch Restore
                          dispatch("restoreBackup", restorePayload, currentUser?.name || "Owner");

                          // 3. Post-restore verification
                          const verified = verifyRestoredState(restorePayload.data);
                          if (!verified.passed) {
                            console.warn("Post-restore issues:", verified.issues);
                          }

                          // 4. Trigger storage sync across tabs
                          if (typeof window !== "undefined") {
                            window.dispatchEvent(new Event("storage"));
                          }
                        }

                        setShowRestoreModal(false);
                        setRestorePayload(null);
                        setRestoreValidation(null);
                        setRestoreInput("");
                        setRestoreError("");
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-md"
                    >
                      <RefreshCw size={15} /> Confirm & Execute Restore
                    </button>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
