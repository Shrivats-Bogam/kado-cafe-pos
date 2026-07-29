import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Coffee, LayoutDashboard, ChefHat, Package, Menu as MenuIcon,
  Users, Sparkles, BarChart3, Settings, LogOut, Calculator as CalculatorIcon,
} from "lucide-react";

import LoginScreen from "../components/LoginScreen.jsx";
import Calculator from "../components/Calculator.jsx";
import Toaster, { useToaster } from "../components/Toaster.jsx";
import Dashboard from "../views/Dashboard.jsx";
import TablesView from "../views/TablesView.jsx";
import TableOrderScreen from "../views/TableOrderScreen.jsx";
import KitchenView from "../views/KitchenView.jsx";
import ParcelView from "../views/ParcelView.jsx";
import MenuManageView from "../views/MenuManageView.jsx";
import CustomersView from "../views/CustomersView.jsx";
import ReportsView from "../views/ReportsView.jsx";
import AIInsightsView from "../views/AIInsightsView.jsx";
import SettingsPanel from "../views/SettingsPanel.jsx";
import TableQRModal from "../views/TableQRModal.jsx";

import { getState, setState, subscribeToChanges, isCloudEnabled } from "../lib/storage.js";
import { defaultState, ROLE_TABS } from "../data/defaults.js";
import { saveSession, loadSession, clearSession, saveUIState, loadUIState } from "../lib/session.js";
import { snapshotStatuses } from "../state/snapshot.js";
import { fireStatusToasts } from "../state/kitchenRealtime.js";
import * as actions from "../state/actions.js";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tables", label: "Tables", icon: Coffee },
  { id: "kitchen", label: "Kitchen", icon: ChefHat },
  { id: "parcel", label: "Parcel", icon: Package },
  { id: "menu", label: "Menu", icon: MenuIcon },
  { id: "customers", label: "Customers", icon: Users },
  { id: "insights", label: "Insights", icon: Sparkles },
  { id: "reports", label: "Reports", icon: BarChart3 },
];

export default function StaffApp() {
  const [state, setStateRaw] = useState(null);
  const [currentUser, setCurrentUser] = useState(loadSession);  // ← hydrate from localStorage on first render
  const [tab, setTab] = useState(() => loadUIState()?.tab || "dashboard");
  const [openTableId, setOpenTableId] = useState(() => loadUIState()?.openTableId || null);
  const [qrTableId, setQrTableId] = useState(null);
  const [showCalc, setShowCalc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [connected, setConnected] = useState(false);
  const skipNextSave = useRef(false);
  const prevKitchenStatuses = useRef({}); // for toast notifications on status changes
  const toaster = useToaster();
  const soundEnabled = loadUIState()?.soundEnabled !== false;

  // ---------- Load ----------
  useEffect(() => {
    (async () => {
      try {
        const json = await getState();
        const next = json ? { ...defaultState(), ...JSON.parse(json) } : defaultState();

        // Snapshot current kitchen statuses so we don't fire a toast for already-existing orders
        prevKitchenStatuses.current = snapshotStatuses(next);

        setStateRaw(next);
      } catch (err) {
        console.error("Kado Cafe: failed to load state", err);
        setStateRaw(defaultState());
      }
      setLoaded(true);
    })();
  }, []);

  // ---------- Persist session ----------
  useEffect(() => {
    if (currentUser) saveSession(currentUser);
    else clearSession();
  }, [currentUser]);

  // ---------- Persist UI state (tab + open table) ----------
  useEffect(() => {
    saveUIState({ tab, openTableId, soundEnabled });
  }, [tab, openTableId, soundEnabled]);

  // ---------- Save on change ----------
  // Writes are now serialized inside storage.js (the saveChain ref that used to
  // live here has been removed). We only need the skip-flag so realtime echoes
  // don't bounce back as writes.
  useEffect(() => {
    if (!loaded || !state) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    setState(JSON.stringify(state));
  }, [state, loaded]);

  // ---------- True realtime sync via Supabase (sub-1s) ----------
  useEffect(() => {
    if (!loaded || !currentUser) return;

    // Watcher: detect status changes between prev and next, fire toasts + sound for our role
    const watched = currentUser.role === "Waiter" || currentUser.role === "Staff" || currentUser.role === "Owner" || currentUser.role === "Manager";

    const refetchAndApply = () => {
      setStateRaw((prev) => {
        if (!prev) return prev;
        (async () => {
          try {
            const json = await getState();
            if (!json) return;
            const incoming = { ...defaultState(), ...prev, ...JSON.parse(json) };
            if (JSON.stringify(incoming) === JSON.stringify(prev)) return;
            skipNextSave.current = true;
            fireStatusToasts(prev, incoming, watched, toaster, soundEnabled);
            prevKitchenStatuses.current = snapshotStatuses(incoming);
            setStateRaw(incoming);
          } catch { /* transient */ }
        })();
        return prev; // skip this render; the async setStateRaw above will trigger it
      });
    };

    // Subscribe to realtime changes — fires within ~200ms of remote writes
    const unsub = subscribeToChanges((json) => {
      if (!json) return;
      setStateRaw((prev) => {
        if (!prev) return prev;
        let incoming;
        try { incoming = { ...defaultState(), ...prev, ...JSON.parse(json) }; }
        catch { return prev; }
        if (JSON.stringify(incoming) === JSON.stringify(prev)) return prev;
        skipNextSave.current = true;
        fireStatusToasts(prev, incoming, watched, toaster, soundEnabled);
        prevKitchenStatuses.current = snapshotStatuses(incoming);
        return incoming;
      });
    });

    // Polling fallback dropped to 90s to catch a dead realtime connection — much less than before.
    // Realtime channel itself tries to reconnect automatically; we just need a safety net.
    const interval = setInterval(refetchAndApply, 90000);

    // Realtime connection status → reflects on the sidebar/offline
    const pingTimer = setTimeout(() => setConnected(true), 1500);

    return () => { unsub && unsub(); clearInterval(interval); clearTimeout(pingTimer); };
  }, [loaded, currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Reset tab when role changes scope ----------
  useEffect(() => {
    if (currentUser && !ROLE_TABS[currentUser.role].includes(tab)) setTab("dashboard");
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Loading ----------
  if (!state) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-500 text-sm">
        Loading Kado Cafe...
      </div>
    );
  }
  if (!currentUser) {
    return (
      <>
        <LoginScreen users={state.users} onLogin={setCurrentUser} />
        <Toaster toaster={toaster} />
      </>
    );
  }

  // ---------- Handlers ----------
  // `update` applies a pure action to the current state. Each action lives in
  // src/state/actions.js so business rules are testable and reusable outside
  // the React tree. The signatures passed to child views are unchanged.
  const update = (apply) => setStateRaw((prev) => apply(prev));

  const saveTableOrder = (tableId, items, customerName, opts = {}) =>
    update((s) => actions.saveTableOrder(s, tableId, items, customerName, opts));

  const generateBillForTable = (tableId, items, customerName, totals, paymentMode, phone, redeemedPoints) =>
    update((s) => actions.generateBillForTable(s, tableId, items, customerName, totals, paymentMode, phone, redeemedPoints));

  const setTableStatus = (tableId, status) =>
    update((s) => actions.setTableStatus(s, tableId, status));

  const cycleKitchen = (kind, id, newStatus) =>
    update((s) => actions.cycleKitchen(s, kind, id, newStatus));

  const setTablePriority = (tableId, priority) =>
    update((s) => actions.setTablePriority(s, tableId, priority));

  const createParcel = (parcel) => update((s) => actions.createParcel(s, parcel));

  const updateParcelStatus = (id, status) =>
    update((s) => actions.updateParcelStatus(s, id, status));

  const deleteParcel = (id) => update((s) => actions.deleteParcel(s, id));

  const addMenuItem = (item) => update((s) => actions.addMenuItem(s, item));
  const editMenuItem = (id, patch) => update((s) => actions.editMenuItem(s, id, patch));
  const deleteMenuItem = (id) => update((s) => actions.deleteMenuItem(s, id));

  const addCustomer = (customer) => update((s) => actions.addCustomer(s, customer));
  const deleteCustomer = (id) => update((s) => actions.deleteCustomer(s, id));

  const addUser = (user) => update((s) => actions.addUser(s, user));
  const removeUser = (id) => update((s) => actions.removeUser(s, id));

  const logout = () => {
    clearSession();
    saveUIState({ tab, openTableId: null, soundEnabled }); // remember UI but close table view
    setOpenTableId(null);
    setCurrentUser(null);
  };

  // ---------- Render ----------
  const openTable = state.tables.find((t) => t.id === openTableId);
  const qrTable = state.tables.find((t) => t.id === qrTableId);
  const allowedTabs = ROLE_TABS[currentUser.role] || [];
  const visibleTabs = TABS.filter((t) => allowedTabs.includes(t.id));

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans pb-20 sm:pb-0 sm:flex">
      {/* Sidebar (desktop) */}
      <div className="hidden sm:flex flex-col w-56 border-r border-stone-800 p-4 gap-1 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-serif text-xl text-amber-500 flex items-center gap-2">
            <Coffee size={20} /> Kado Cafe
          </h1>
          {isCloudEnabled && (
            <span title={connected ? "Realtime connected" : "Connecting…"} className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
          )}
        </div>
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
              tab === t.id ? "bg-amber-500 text-stone-950 font-medium" : "text-stone-400 hover:bg-stone-900"
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}

        {!isCloudEnabled && (
          <p className="mt-2 text-[10px] text-stone-600 px-3 leading-snug">
            Offline mode (localStorage). Add Supabase keys in .env to sync across devices.
          </p>
        )}

        <div className="mt-auto flex flex-col gap-1 pt-4 border-t border-stone-800">
          {allowedTabs.includes("settings") && (
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-stone-400 hover:bg-stone-900"
            >
              <Settings size={16} /> Settings
            </button>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-stone-400 hover:bg-stone-900"
          >
            <LogOut size={16} /> {currentUser.name}
          </button>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="sm:hidden sticky top-0 z-30 bg-stone-950 flex items-center justify-between gap-2 p-4 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Coffee size={18} className="text-amber-500" />
            <h1 className="font-serif text-lg text-stone-50">Kado Cafe</h1>
            {isCloudEnabled && (
              <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
            )}
          </div>
          <div className="flex items-center gap-1">
            {allowedTabs.includes("settings") && (
              <button onClick={() => setShowSettings(true)} className="rounded-xl p-2 bg-stone-800 hover:bg-stone-700">
                <Settings size={15} />
              </button>
            )}
            <button onClick={logout} className="rounded-xl p-2 bg-stone-800 hover:bg-stone-700">
              <LogOut size={15} />
            </button>
          </div>
        </div>

        <div className="p-4 max-w-5xl mx-auto">
          {tab === "dashboard" && <Dashboard state={state} />}
          {tab === "tables" && (
            <TablesView
              tables={state.tables}
              menuItems={state.menuItems}
              onOpenTable={setOpenTableId}
              onSetStatus={setTableStatus}
              onShowQR={setQrTableId}
            />
          )}
          {tab === "kitchen" && (
            <KitchenView
              tables={state.tables}
              parcels={state.parcels}
              menuItems={state.menuItems}
              onCycleKitchen={cycleKitchen}
              onSetPriority={setTablePriority}
              currentUser={currentUser}
            />
          )}
          {tab === "parcel" && (
            <ParcelView
              parcels={state.parcels}
              menuItems={state.menuItems}
              onCreate={createParcel}
              onUpdateStatus={updateParcelStatus}
              onDelete={deleteParcel}
            />
          )}
          {tab === "menu" && (
            <MenuManageView
              menuItems={state.menuItems}
              onAdd={addMenuItem}
              onEdit={editMenuItem}
              onDelete={deleteMenuItem}
            />
          )}
          {tab === "customers" && (
            <CustomersView
              customers={state.customers}
              orderHistory={state.orderHistory}
              menuItems={state.menuItems}
              onAdd={addCustomer}
              onDelete={deleteCustomer}
            />
          )}
          {tab === "insights" && (
            <AIInsightsView orderHistory={state.orderHistory} menuItems={state.menuItems} />
          )}
          {tab === "reports" && (
            <ReportsView orderHistory={state.orderHistory} menuItems={state.menuItems} />
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 bg-stone-900 border-t border-stone-800 z-20 flex overflow-x-auto no-scrollbar">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-col items-center gap-0.5 py-2.5 px-4 text-xs shrink-0 ${
              tab === t.id ? "text-amber-500" : "text-stone-500"
            }`}
          >
            <t.icon size={18} /> {t.label}
          </button>
        ))}
      </div>

      {/* Floating calculator */}
      <button
        onClick={() => setShowCalc(true)}
        className="fixed right-4 bottom-20 sm:bottom-6 sm:right-6 z-30 rounded-full bg-amber-500 text-stone-950 p-3.5 shadow-lg shadow-black/40 active:scale-95 transition"
        aria-label="Open calculator"
      >
        <CalculatorIcon size={20} />
      </button>

      {openTable && (
        <TableOrderScreen
          table={openTable}
          menuItems={state.menuItems}
          customers={state.customers}
          onClose={() => setOpenTableId(null)}
          onSave={(cart, customerName, opts) => saveTableOrder(openTable.id, cart, customerName, opts)}
          onGenerateBill={(cart, customerName, totals, paymentMode, phone, redeemedPoints) =>
            generateBillForTable(openTable.id, cart, customerName, totals, paymentMode, phone, redeemedPoints)
          }
        />
      )}
      {qrTable && <TableQRModal table={qrTable} onClose={() => setQrTableId(null)} />}
      {showCalc && <Calculator onClose={() => setShowCalc(false)} />}
      {showSettings && (
        <SettingsPanel
          users={state.users}
          onAddUser={addUser}
          onRemoveUser={removeUser}
          onClose={() => setShowSettings(false)}
        />
      )}

      <Toaster toaster={toaster} />
    </div>
  );
}
