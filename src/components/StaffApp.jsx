import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from "react";
import {
  Coffee, LayoutDashboard, ChefHat, Package, Menu as MenuIcon,
  Users, Sparkles, BarChart3, Settings, LogOut, Lock, Calculator as CalculatorIcon, ShieldCheck, KeyRound, ScrollText
} from "lucide-react";

import LoginScreen from "../components/LoginScreen.jsx";
import Calculator from "../components/Calculator.jsx";
import Toaster, { useToaster } from "../components/Toaster.jsx";
import ChangePinModal from "../components/ChangePinModal.jsx";

const Dashboard = lazy(() => import("../views/Dashboard.jsx"));
const TablesView = lazy(() => import("../views/TablesView.jsx"));
const TableOrderScreen = lazy(() => import("../views/TableOrderScreen.jsx"));
const KitchenView = lazy(() => import("../views/KitchenView.jsx"));
const ParcelView = lazy(() => import("../views/ParcelView.jsx"));
const MenuManageView = lazy(() => import("../views/MenuManageView.jsx"));
const CustomersView = lazy(() => import("../views/CustomersView.jsx"));
const ReportsView = lazy(() => import("../views/ReportsView.jsx"));
const EmployeesView = lazy(() => import("../views/EmployeesView.jsx"));
const ActivityLogView = lazy(() => import("../views/ActivityLogView.jsx"));
const InventoryView = lazy(() => import("../views/InventoryView.jsx"));
const AIInsightsView = lazy(() => import("../views/AIInsightsView.jsx"));
const SettingsPanel = lazy(() => import("../views/SettingsPanel.jsx"));
const SettingsView = lazy(() => import("../views/SettingsView.jsx"));
const TableQRModal = lazy(() => import("../views/TableQRModal.jsx"));

import { getState, setState, subscribeToChanges, isCloudEnabled, LS_KEY, getSupabaseClient, checkConnectionHealth, mirrorOrderToLedger, fetchOrderHistoryFromLedger, fetchOrderHistorySince, mergeOrderHistory, mirrorActivityToLedger, setSessionPin, clearSessionPin } from "../lib/storage.js";
import { defaultState, ROLE_TABS } from "../data/defaults.js";
import { saveSession, loadSession, clearSession, saveUIState, loadUIState } from "../lib/session.js";
import { snapshotStatuses } from "../state/snapshot.js";
import { fireStatusToasts } from "../state/kitchenRealtime.js";
import { initializeAuthSession, loginWithEmail, logoutUser, resolveOrganizationMembership } from "../lib/auth.js";
import { filterProductionAccounts } from "../lib/env.js";
import { executeServerPayment, executeServerSplitPayment, executeServerRefund } from "../lib/serverTransactions.js";
import { makeId } from "../lib/id.js";
import { ErrorBoundary } from "./ErrorBoundary.jsx";
import * as actions from "../state/actions.js";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tables", label: "Tables", icon: Coffee },
  { id: "kitchen", label: "Kitchen", icon: ChefHat },
  { id: "parcel", label: "Parcel", icon: Package },
  { id: "menu", label: "Menu", icon: MenuIcon },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "customers", label: "Customers", icon: Users },
  { id: "insights", label: "Insights", icon: Sparkles },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "employees", label: "Employees", icon: ShieldCheck },
  { id: "activity", label: "Activity", icon: ScrollText },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function StaffApp() {
  const [state, setStateRaw] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [cloudSession, setCloudSession] = useState(null);
  const [tab, setTab] = useState(() => loadUIState()?.tab || "dashboard");
  const [openTableId, setOpenTableId] = useState(() => loadUIState()?.openTableId || null);
  const [qrTableId, setQrTableId] = useState(null);
  const [showCalc, setShowCalc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting"); // "connected" | "reconnecting" | "offline"
  const skipNextSave = useRef(false);
  const prevKitchenStatuses = useRef({}); // for toast notifications on status changes
  const lastVersionRef = useRef(null);
  const toaster = useToaster();
  const soundEnabled = loadUIState()?.soundEnabled !== false;

  // ---------- Load & Auth Lifecycle ----------
  useEffect(() => {
    let authUnsub = null;
    (async () => {
      try {
        const supabase = getSupabaseClient();

        // 1. Register Supabase Auth State Change Listener
        if (supabase && typeof supabase.auth?.onAuthStateChange === "function") {
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
              if (session?.user) {
                const membership = await resolveOrganizationMembership(supabase, session.user.id);
                if (membership && membership.active !== false) {
                  const trustedUser = {
                    id: session.user.id,
                    email: session.user.email,
                    name: membership.name,
                    role: membership.role,
                    organization_id: membership.organization_id,
                    isCloud: true,
                    active: true,
                  };
                  setCloudSession({ user: session.user, membership, role: membership.role });
                  setCurrentUser((prev) => (prev ? prev : trustedUser));
                } else {
                  toaster.push("Account disabled or access revoked.", "rush");
                  await logoutUser(supabase);
                  setCurrentUser(null);
                  setCloudSession(null);
                  clearSession();
                }
              }
            } else if (event === "SIGNED_OUT") {
              setCurrentUser(null);
              setCloudSession(null);
              clearSession();
            }
          });
          authUnsub = subscription;
        }

        // 2. Load Application State first so employee roster is immediately available
        const json = await getState();
        const next = json ? { ...defaultState(), ...JSON.parse(json) } : defaultState();

        // Snapshot current kitchen statuses so we don't fire a toast for already-existing orders
        prevKitchenStatuses.current = snapshotStatuses(next);
        setStateRaw(next);

        // 3. Initialize Auth Session on Boot
        const authData = await initializeAuthSession(supabase);
        if (authData && authData.user) {
          setCloudSession(authData);

          const empRoster = next.employees || [];
          const matchedEmp = empRoster.find(e => 
            (e.email && e.email.toLowerCase().trim() === authData.user.email?.toLowerCase().trim()) ||
            (authData.role === "Owner" && e.role === "Owner")
          );

          // If an employee session was persisted, verify it against the roster
          const localSess = loadSession();
          if (localSess && (localSess.id || localSess.pin)) {
            const activeEmp = empRoster.find(e => (localSess.id && e.id === localSess.id) || (localSess.pin && e.pin === localSess.pin));
            if (activeEmp && activeEmp.status !== "disabled" && activeEmp.status !== "Inactive") {
              const effectivePin = localSess.pin || activeEmp.pin;
              if (effectivePin) setSessionPin(effectivePin);
              setCurrentUser({
                id: activeEmp.id,
                name: activeEmp.name,
                role: activeEmp.role,
                pin: activeEmp.pin,
                status: activeEmp.status,
                isCloud: true,
                organization_id: authData.organization_id || "00000000-0000-0000-0000-000000000001",
              });
              if ((next.orderHistory || []).length === 0) {
                const ledgerOrders = await fetchOrderHistoryFromLedger(250);
                if (ledgerOrders.length > 0) {
                  next.orderHistory = ledgerOrders;
                  skipNextSave.current = true;
                  setStateRaw((prev) => prev ? { ...prev, orderHistory: ledgerOrders } : prev);
                }
              } else {
                // Sprint 3: Delta History Sync for returning devices
                const existing = next.orderHistory || [];
                let maxTime = 0;
                for (const o of existing) {
                  const ts = new Date(o.paidAt || o.createdAt || 0).getTime();
                  if (!isNaN(ts) && ts > maxTime) maxTime = ts;
                }
                if (maxTime > 0) {
                  const deltaOrders = await fetchOrderHistorySince(new Date(maxTime).toISOString(), 250);
                  if (deltaOrders.length > 0) {
                    const merged = mergeOrderHistory(existing, deltaOrders, 250);
                    next.orderHistory = merged;
                    skipNextSave.current = true;
                    setStateRaw((prev) => prev ? { ...prev, orderHistory: merged } : prev);
                  }
                }
              }
            } else {
              setCurrentUser(null);
              clearSession();
              clearSessionPin();
            }
          } else {
            // Fresh boot or locked terminal: stay locked on PIN selection screen with cloud active
            setCurrentUser(null);
          }
        } else {
          setCloudSession(null);
          const localSess = loadSession();
          if (localSess && !isCloudEnabled) {
            setCurrentUser(localSess);
          } else {
            setCurrentUser(null);
            clearSession();
          }
        }
      } catch (err) {
        console.error("Kado Cafe: failed to load state", err);
        setStateRaw(defaultState());
      }
      setLoaded(true);
    })();

    return () => {
      authUnsub && authUnsub.unsubscribe && authUnsub.unsubscribe();
    };
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
            skipNextSave.current = true;
            fireStatusToasts(prev, incoming, watched, toaster, soundEnabled);
            prevKitchenStatuses.current = snapshotStatuses(incoming);
            setStateRaw(incoming);
          } catch { /* transient */ }
        })();
        return prev;
      });
    };

    // Network online & offline event handlers
    const handleOnline = () => {
      setConnectionStatus("connected");
      refetchAndApply();
    };
    const handleOffline = () => {
      setConnectionStatus("reconnecting");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setConnectionStatus("offline");
      setConnected(false);
    }

    // Subscribe to realtime changes with active channel lifecycle status callback
    const unsub = subscribeToChanges(
      (json, version) => {
        if (!json) return;
        // Cheap version gate: ignore stale/duplicate broadcasts
        if (version && lastVersionRef.current && version <= lastVersionRef.current) return;
        if (version) lastVersionRef.current = version;

        setStateRaw((prev) => {
          if (!prev) return prev;
          let incoming;
          try { incoming = { ...defaultState(), ...prev, ...JSON.parse(json) }; }
          catch { return prev; }
          skipNextSave.current = true;
          fireStatusToasts(prev, incoming, watched, toaster, soundEnabled);
          prevKitchenStatuses.current = snapshotStatuses(incoming);
          return incoming;
        });
      },
      (status) => {
        if (status === "SUBSCRIBED") {
          setConnectionStatus("connected");
          setConnected(true);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnectionStatus("reconnecting");
          setConnected(false);
        }
      }
    );

    // Active heartbeat check every 30s to verify cloud database connectivity & latency
    const heartbeatInterval = setInterval(async () => {
      const health = await checkConnectionHealth();
      if (!health.online) {
        setConnectionStatus("offline");
        setConnected(false);
      } else if (health.mode === "cloud") {
        setConnectionStatus("connected");
        setConnected(true);
      }
    }, 30000);

    // Multi-tab storage sync for local mode (sub-10ms response when another tab updates localStorage)
    const handleStorageChange = (e) => {
      if ((e.key === LS_KEY || e.key === "kado-cafe-state") && e.newValue) {
        refetchAndApply();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => { 
      unsub && unsub(); 
      clearInterval(heartbeatInterval);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loaded, currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Auto Session Timeout (Idle Shift Lock after 5 mins) ----------
  useEffect(() => {
    if (!currentUser) return; // already locked

    const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes of inactivity
    let timeoutId;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lockShift();
        toaster.push("Terminal locked due to inactivity", "info");
      }, IDLE_TIMEOUT_MS);
    };

    const activityEvents = ["mousedown", "mousemove", "keydown", "touchstart", "scroll"];
    activityEvents.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Reset tab & sync current user role when employee record changes ----------
  useEffect(() => {
    if (currentUser && state) {
      // Re-verify currentUser against authoritative state.employees
      const emp = (state.employees || []).find(e => 
        (e.id && String(e.id) === String(currentUser.id)) || 
        (currentUser.email && e.email && e.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) ||
        (currentUser.role === "Owner" && e.role === "Owner") ||
        (e.pin && String(e.pin).trim() === String(currentUser.pin).trim())
      );
      if (emp && (emp.role !== currentUser.role || emp.name !== currentUser.name || String(emp.pin).trim() !== String(currentUser.pin).trim())) {
        if (emp.status === "disabled" || emp.status === "Inactive") {
          setCurrentUser(null);
          return;
        }
        setCurrentUser(prev => ({
          ...prev,
          id: emp.id,
          name: emp.name,
          role: emp.role,
          pin: String(emp.pin).trim(),
          email: emp.email || prev?.email,
          status: emp.status
        }));
      }

      const allowed = ROLE_TABS[currentUser.role] || ROLE_TABS.Owner;
      if (!allowed.includes(tab)) {
        const defaultTab = allowed[0] || "dashboard";
        setTab(defaultTab);
      }
    }
  }, [currentUser, tab, state]);

  // ---------- Loading ----------
  if (!state) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-500 text-sm">
        Loading Kado Cafe...
      </div>
    );
  }
  // `update` applies a pure action to the current state. Each action lives in
  // src/state/actions.js so business rules are testable and reusable outside
  // the React tree. The signatures passed to child views are unchanged.
  const update = (apply) => {
    setStateRaw((prev) => {
      try {
        return apply(prev);
      } catch (err) {
        console.warn("[kado-cafe] Action execution error:", err.message);
        setTimeout(() => {
          toaster.push(err.message || "Failed to update state", "warn");
        }, 0);
        return prev;
      }
    });
  };
  if (typeof window !== "undefined") {
    window.__kadoUpdate = update;
    window.__kadoActions = actions;
  }

  // Dynamically derive active login user cards from state.employees and state.users
  const loginUsers = (() => {
    if (!state) return [];
    const employees = state.employees || [];
    const users = state.users || [];

    const empUsers = employees
      .filter(e => e.status !== "disabled" && e.status !== "Inactive")
      .map(e => ({
        id: e.id,
        name: e.name,
        role: e.role,
        pin: e.pin,
        status: e.status,
        email: e.email,
        active: true
      }));

    const legacyUsers = users.filter(u =>
      u.active !== false &&
      u.status !== "disabled" &&
      u.status !== "Inactive" &&
      !empUsers.some(e => e.id === u.id || (e.role === u.role && e.pin === u.pin) || (e.name === u.name && e.pin === u.pin))
    );

    return filterProductionAccounts([...empUsers, ...legacyUsers]);
  })();

  const handleCloudLogin = async (email, password) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error("Cloud authentication service not available on this terminal.");
    }
    const session = await loginWithEmail(supabase, email, password);
    if (!session || !session.user || !session.role) {
      throw new Error("No active organization membership found for this user account.");
    }
    if (session.member && session.member.active === false) {
      throw new Error("Account is disabled or inactive.");
    }

    const empRoster = state?.employees || [];
    const matchedEmp = empRoster.find(e => 
      (e.email && e.email.toLowerCase().trim() === session.user.email?.toLowerCase().trim()) ||
      (session.role === "Owner" && e.role === "Owner")
    );

    const authenticatedCloudUser = {
      id: matchedEmp?.id || session.user.id,
      name: matchedEmp?.name || (session.member?.name && session.member.name !== "Alex Morgan" ? session.member.name : session.user.email?.split("@")[0] || "Owner"),
      role: matchedEmp?.role || session.role,
      pin: matchedEmp?.pin || "1234",
      email: session.user.email,
      organization_id: session.organization_id || "00000000-0000-0000-0000-000000000001",
      isCloud: true,
      active: true,
    };

    setCloudSession(session);
    setCurrentUser(authenticatedCloudUser);

    const cloudLog = {
      employeeName: authenticatedCloudUser.name,
      action: "Logged into POS via Cloud Auth",
      module: "Auth"
    };
    update((s) => actions.recordActivityLog(s, cloudLog));
    mirrorActivityToLedger(cloudLog);

    return authenticatedCloudUser;
  };

  if (!currentUser) {
    const cloudDisplayName = (() => {
      if (!cloudSession?.user) return "";
      const empRoster = state?.employees || [];
      const emp = empRoster.find(e => 
        (e.email && e.email.toLowerCase().trim() === cloudSession.user.email?.toLowerCase().trim()) ||
        (cloudSession.role === "Owner" && e.role === "Owner")
      );
      if (emp?.name) return `${emp.name} (${emp.role})`;
      if (cloudSession.member?.name && cloudSession.member.name !== "Alex Morgan") {
        return `${cloudSession.member.name} (${cloudSession.role || "Member"})`;
      }
      return cloudSession.user.email || "Authenticated";
    })();

    return (
      <>
        <LoginScreen
          users={loginUsers}
          hasCloudSession={Boolean(cloudSession?.user)}
          cloudUser={cloudDisplayName}
          onLogin={async (u, pinEntered) => {
            // Authoritative employee lookup from state.employees
            const emp = (state.employees || []).find(e => (e.id && e.id === u.id) || (e.pin && e.pin === u.pin));
            if (emp && (emp.status === "disabled" || emp.status === "Inactive")) {
              toaster.push("Account Disabled. Please contact the Owner.", "rush");
              return;
            }

            const effectivePin = pinEntered || u.pin || emp?.pin;
            if (effectivePin) setSessionPin(effectivePin);

            // Always construct user payload from authoritative state.employees record
            const authenticatedUser = emp ? {
              id: emp.id,
              name: emp.name,
              role: emp.role,
              pin: emp.pin,
              status: emp.status,
              isCloud: true,
              organization_id: cloudSession?.organization_id || "00000000-0000-0000-0000-000000000001",
            } : { ...u, isCloud: true };

            setCurrentUser(authenticatedUser);

            // Phase 6 cold ledger hydration: with sessionPin now set, hydrate if local orderHistory is empty
            if ((state.orderHistory || []).length === 0) {
              const ledgerOrders = await fetchOrderHistoryFromLedger(250);
              if (ledgerOrders.length > 0) {
                skipNextSave.current = true;
                setStateRaw((prev) => prev ? { ...prev, orderHistory: ledgerOrders } : prev);
              }
            } else {
              // Sprint 3: Delta History Sync for active/stale terminals
              const existing = state.orderHistory || [];
              let maxTime = 0;
              for (const o of existing) {
                const ts = new Date(o.paidAt || o.createdAt || 0).getTime();
                if (!isNaN(ts) && ts > maxTime) maxTime = ts;
              }
              if (maxTime > 0) {
                const deltaOrders = await fetchOrderHistorySince(new Date(maxTime).toISOString(), 250);
                if (deltaOrders.length > 0) {
                  const merged = mergeOrderHistory(existing, deltaOrders, 250);
                  skipNextSave.current = true;
                  setStateRaw((prev) => prev ? { ...prev, orderHistory: merged } : prev);
                }
              }
            }

            // Record login activity & mirror to cloud ledger
            const shiftLog = {
              employeeName: authenticatedUser.name,
              action: `Staff shift active: ${authenticatedUser.name} (${authenticatedUser.role})`,
              module: "Auth"
            };
            update((s) => actions.recordActivityLog(s, shiftLog));
            mirrorActivityToLedger(shiftLog);
          }}
          onCloudLogin={handleCloudLogin}
        />
        <Toaster toaster={toaster} />
      </>
    );
  }

  const saveTableOrder = (tableId, items, customerName, opts = {}) =>
    update((s) => actions.saveTableOrder(s, tableId, items, customerName, opts));

  const generateBillForTable = async (tableId, items, customerName, totals, paymentMode, phone, redeemedPoints, splitBreakdown = null) => {
    const supabase = getSupabaseClient();
    const finalTotal = Math.max(0, totals.grandTotal - (redeemedPoints || 0));
    const isPending = paymentMode === "Pending";
    let serverTxResult = null;

    if (!isPending) {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        throw new Error("OFFLINE_PAYMENT_BLOCKED: Financial transactions cannot be settled while offline. Reconnect to proceed.");
      }

      if (isCloudEnabled && supabase) {
        const orderId = makeId("o");
        if (paymentMode === "Split" && Array.isArray(splitBreakdown) && splitBreakdown.length > 0) {
          serverTxResult = await executeServerSplitPayment({
            supabaseClient: supabase,
            orderId,
            splitPayments: splitBreakdown
          });
        } else {
          serverTxResult = await executeServerPayment({
            supabaseClient: supabase,
            orderId,
            paymentMethod: paymentMode,
            amount: finalTotal
          });
        }
      }
    }

    update((s) => {
      const next = actions.generateBillForTable(s, tableId, items, customerName, totals, paymentMode, phone, redeemedPoints, serverTxResult);
      // Mirror paid orders to pos_orders (idempotent upsert — safe if StrictMode double-invokes)
      if (!isPending && serverTxResult?.success) {
        const rec = (next.orderHistory || []).find((o) => o.id === serverTxResult.order_id);
        if (rec) mirrorOrderToLedger(rec);
      }
      return next;
    });
    return serverTxResult;
  };

  const setTableStatus = (tableId, status) =>
    update((s) => actions.setTableStatus(s, tableId, status));

  const transferTable = (fromId, toId) => update((s) => actions.transferTable(s, fromId, toId));
  const mergeTables = (sourceId, targetId) => update((s) => actions.mergeTables(s, sourceId, targetId));
  const splitTable = (sourceId, targetId, itemsToMove) => update((s) => actions.splitTable(s, sourceId, targetId, itemsToMove));
  const reserveTable = (tableId, name, count) => update((s) => actions.reserveTable(s, tableId, name, count));
  const setTableCleaning = (tableId) => update((s) => actions.setTableCleaning(s, tableId));
  const duplicateTableOrder = (sourceId, targetId) => update((s) => actions.duplicateTableOrder(s, sourceId, targetId));
  const addTable = (tableData) => update((s) => actions.addTable(s, tableData));
  const editTable = (tableId, patch) => update((s) => actions.editTable(s, tableId, patch));
  const deleteTable = (tableId) => update((s) => actions.deleteTable(s, tableId));

  const cycleKitchen = (kind, id, newStatus) =>
    update((s) => actions.cycleKitchen(s, kind, id, newStatus));

  const setTablePriority = (tableId, priority) =>
    update((s) => actions.setTablePriority(s, tableId, priority));

  const createParcel = async (parcel) => {
    update((s) => actions.createParcel(s, parcel));
  };

  const processRefund = async ({ orderId, refundAmount, reason }) => {
    const supabase = getSupabaseClient();
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      throw new Error("OFFLINE_REFUND_BLOCKED: Refunds cannot be processed while offline. Reconnect to proceed.");
    }

    const staffRole = currentUser?.role || "Manager";
    if (!["Owner", "Manager"].includes(staffRole)) {
      throw new Error(`UNAUTHORIZED_ROLE: Role '${staffRole}' does not have refund permissions. Only Owner and Manager can process refunds.`);
    }

    let serverTxResult = null;
    if (isCloudEnabled && supabase) {
      serverTxResult = await executeServerRefund({
        supabaseClient: supabase,
        orderId,
        refundAmount,
        reason
      });
    }

    update((s) => actions.refundOrder(s, orderId, refundAmount, reason, staffRole, serverTxResult));
    const refundLog = {
      employeeName: currentUser?.name || "Staff",
      action: `Refund processed: ₹${refundAmount} for order ${orderId}`,
      module: "Billing",
      details: reason
    };
    update((s) => actions.recordActivityLog(s, refundLog));
    mirrorActivityToLedger(refundLog);
    return serverTxResult;
  };

  const updateParcelStatus = (id, status) =>
    update((s) => actions.updateParcelStatus(s, id, status));

  const deleteParcel = (id) => update((s) => actions.deleteParcel(s, id));

  const addMenuItem = (item) => update((s) => actions.addMenuItem(s, item));
  const editMenuItem = (id, patch) => update((s) => actions.editMenuItem(s, id, patch));
  const deleteMenuItem = (id) => update((s) => actions.deleteMenuItem(s, id));
  const duplicateMenuItem = (id) => update((s) => actions.duplicateMenuItem(s, id));
  const reorderMenuItems = (items) => update((s) => actions.reorderMenuItems(s, items));

  const addCategory = (cat) => update((s) => actions.addCategory(s, cat));
  const editCategory = (oldName, newName) => update((s) => actions.editCategory(s, oldName, newName));
  const deleteCategory = (cat) => update((s) => actions.deleteCategory(s, cat));
  const reorderCategories = (cats) => update((s) => actions.reorderCategories(s, cats));

  const addCustomer = (customer) => update((s) => actions.addCustomer(s, customer));
  const deleteCustomer = (id) => update((s) => actions.deleteCustomer(s, id));

  const addUser = (user) => update((s) => actions.addUser(s, user));
  const removeUser = (id) => update((s) => actions.removeUser(s, id));

  const logout = async () => {
    const supabase = getSupabaseClient();
    await logoutUser(supabase);
    setCloudSession(null);
    clearSession();
    clearSessionPin();
    saveUIState({ tab, openTableId: null, soundEnabled });
    setOpenTableId(null);
    setCurrentUser(null);
  };

  const lockShift = () => {
    // Quick lock to return to PIN selection screen
    clearSessionPin();
    setCurrentUser(null);
    saveUIState({ tab, openTableId: null, soundEnabled });
    setOpenTableId(null);
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
            <span
              title={
                connectionStatus === "connected"
                  ? "Realtime connected (<200ms cloud sync)"
                  : connectionStatus === "offline"
                  ? "Offline mode (Local storage active)"
                  : "Reconnecting to cloud..."
              }
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                connectionStatus === "connected"
                  ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                  : connectionStatus === "offline"
                  ? "bg-rose-500"
                  : "bg-amber-500 animate-pulse"
              }`}
            />
          )}
        </div>
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            data-testid={`nav-${t.id}`}
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
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-stone-400 hover:bg-stone-900 cursor-pointer"
            >
              <Settings size={16} /> Settings
            </button>
          )}
          <button
            onClick={lockShift}
            title="Lock POS / Switch Shift"
            className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-stone-300 bg-stone-900 border border-stone-800 hover:border-amber-500/50 transition cursor-pointer"
          >
            <span className="flex items-center gap-2 truncate">
              <Lock size={15} className="text-amber-400 shrink-0" />
              <span className="font-medium text-stone-200 truncate">{currentUser.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 font-medium">
                {currentUser.role}
              </span>
            </span>
            <span className="text-[10px] text-stone-500 uppercase font-semibold shrink-0">Lock</span>
          </button>
          <button
            onClick={() => setShowChangePin(true)}
            title="Change Your Security PIN"
            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs text-stone-400 hover:text-stone-100 hover:bg-stone-900 transition cursor-pointer"
          >
            <KeyRound size={13} /> Change PIN
          </button>
          <button
            onClick={logout}
            title="Sign out of Cloud Account on this device"
            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs text-stone-500 hover:text-rose-400 transition cursor-pointer"
          >
            <LogOut size={13} /> Cloud Sign Out
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
              <span
                title={
                  connectionStatus === "connected"
                    ? "Realtime connected (<200ms cloud sync)"
                    : connectionStatus === "offline"
                    ? "Offline mode (Local storage active)"
                    : "Reconnecting to cloud..."
                }
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  connectionStatus === "connected"
                    ? "bg-emerald-500"
                    : connectionStatus === "offline"
                    ? "bg-rose-500"
                    : "bg-amber-500 animate-pulse"
                }`}
              />
            )}
          </div>
          <div className="flex items-center gap-1">
            {allowedTabs.includes("settings") && (
              <button onClick={() => setShowSettings(true)} className="rounded-xl p-2 bg-stone-800 hover:bg-stone-700">
                <Settings size={15} />
              </button>
            )}
            <button onClick={() => setShowChangePin(true)} title="Change My PIN" className="rounded-xl p-2 bg-stone-800 hover:bg-stone-700 text-stone-300">
              <KeyRound size={15} />
            </button>
            <button onClick={lockShift} title="Lock POS" className="rounded-xl p-2 bg-stone-800 hover:bg-stone-700 text-stone-300">
              <Lock size={15} />
            </button>
            <button onClick={logout} title="Cloud Sign Out" className="rounded-xl p-2 bg-stone-800 hover:bg-stone-700 text-stone-400">
              <LogOut size={15} />
            </button>
          </div>
        </div>

        <div className="p-4 max-w-6xl mx-auto">
          <ErrorBoundary key={tab} name={tab.charAt(0).toUpperCase() + tab.slice(1)}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-64 p-10 text-stone-400">
                Loading…
              </div>
            }>
              {tab === "dashboard" && (
                <Dashboard 
                  state={state} 
                  onNavigate={(targetTab) => setTab(targetTab)} 
                  currentUser={currentUser} 
                />
              )}
              {tab === "tables" && (
                <TablesView
                  tables={state.tables}
                  menuItems={state.menuItems}
                  onOpenTable={setOpenTableId}
                  onSetStatus={setTableStatus}
                  onShowQR={setQrTableId}
                  onTransferTable={transferTable}
                  onMergeTable={mergeTables}
                  onSplitTable={splitTable}
                  onReserveTable={reserveTable}
                  onSetCleaning={setTableCleaning}
                  onDuplicateOrder={duplicateTableOrder}
                  onAddTable={addTable}
                  onEditTable={editTable}
                  onDeleteTable={deleteTable}
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
                  categories={state.categories}
                  onAdd={addMenuItem}
                  onEdit={editMenuItem}
                  onDelete={deleteMenuItem}
                  onDuplicate={duplicateMenuItem}
                  onReorderItems={reorderMenuItems}
                  onAddCategory={addCategory}
                  onEditCategory={editCategory}
                  onDeleteCategory={deleteCategory}
                  onReorderCategories={reorderCategories}
                />
              )}
              {tab === "inventory" && (
                <InventoryView
                  inventory={state.inventory}
                  recipes={state.recipes}
                  inventoryLogs={state.inventoryLogs}
                  menuItems={state.menuItems}
                  onAddInventory={(item) => update(s => actions.addInventoryItem(s, item))}
                  onEditInventory={(id, patch) => update(s => actions.editInventoryItem(s, id, patch))}
                  onDeleteInventory={(id) => update(s => actions.deleteInventoryItem(s, id))}
                  onSaveRecipe={(menuItemId, ingredients) => update(s => actions.saveRecipe(s, menuItemId, ingredients))}
                  onAddPurchase={(purchaseData) => update(s => actions.addPurchaseEntry(s, purchaseData))}
                  onAdjustStock={(adjustmentData) => update(s => actions.adjustStock(s, adjustmentData))}
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
                <AIInsightsView 
                  state={state} 
                  orderHistory={state.orderHistory} 
                  menuItems={state.menuItems} 
                  onNavigate={(targetTab) => setTab(targetTab)} 
                />
              )}
              {tab === "reports" && (
                <ReportsView state={state} />
              )}
              {tab === "employees" && (
                <EmployeesView
                  state={state}
                  dispatch={(actionName, ...args) => update((s) => actions[actionName](s, ...args))}
                  currentUser={currentUser}
                />
              )}
              {tab === "activity" && currentUser?.role === "Owner" && (
                <ActivityLogView
                  state={state}
                  currentUser={currentUser}
                />
              )}
              {tab === "settings" && (
                <SettingsView
                  state={state}
                  dispatch={(actionName, ...args) => update((s) => actions[actionName](s, ...args))}
                  currentUser={currentUser}
                  onNavigate={(targetTab) => setTab(targetTab)}
                />
              )}
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 bg-stone-900 border-t border-stone-800 z-20 flex items-center justify-around py-1 px-2">
        {visibleTabs.slice(0, 3).map((t) => (
          <button
            key={t.id}
            data-testid={`mobile-nav-${t.id}`}
            onClick={() => {
              setTab(t.id);
              setShowMobileMore(false);
            }}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-3 text-[11px] font-medium transition cursor-pointer ${
              tab === t.id ? "text-amber-500 font-bold" : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <t.icon size={18} /> {t.label}
          </button>
        ))}

        <button
          type="button"
          data-testid="mobile-nav-more"
          onClick={() => setShowMobileMore(!showMobileMore)}
          className={`flex flex-col items-center gap-0.5 py-1.5 px-3 text-[11px] font-medium transition cursor-pointer ${
            showMobileMore || !visibleTabs.slice(0, 3).some((t) => t.id === tab)
              ? "text-amber-500 font-bold"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          <MenuIcon size={18} /> More
        </button>
      </div>

      {/* Mobile 'More' Drawer Bottom Sheet */}
      {showMobileMore && (
        <div className="sm:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-stone-900 border-t border-stone-800 rounded-t-3xl p-4 flex flex-col gap-4 animate-in slide-in-from-bottom duration-200 max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-300">All POS Navigation Modules</span>
              <button
                onClick={() => setShowMobileMore(false)}
                className="text-stone-400 hover:text-stone-200 text-xs font-bold px-3 py-1 bg-stone-800 rounded-lg cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {visibleTabs.map((t) => (
                <button
                  key={t.id}
                  data-testid={`mobile-nav-${t.id}`}
                  onClick={() => {
                    setTab(t.id);
                    setShowMobileMore(false);
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs gap-1.5 transition cursor-pointer ${
                    tab === t.id
                      ? "bg-amber-500 text-stone-950 font-bold border-amber-400 shadow-md"
                      : "bg-stone-950 text-stone-300 border-stone-800 hover:bg-stone-800"
                  }`}
                >
                  <t.icon size={20} />
                  <span className="text-[10px] text-center leading-tight truncate w-full">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating calculator */}
      <button
        onClick={() => setShowCalc(true)}
        className="fixed right-4 bottom-20 sm:bottom-6 sm:right-6 z-30 rounded-full bg-amber-500 text-stone-950 p-3.5 shadow-lg shadow-black/40 active:scale-95 transition"
        aria-label="Open calculator"
      >
        <CalculatorIcon size={20} />
      </button>

      {openTable && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center text-stone-300">Loading…</div>}>
          <TableOrderScreen
            table={openTable}
            tables={state.tables}
            menuItems={state.menuItems}
            customers={state.customers}
            currentUser={currentUser}
            onClose={() => setOpenTableId(null)}
            onSave={(cart, customerName, opts) => saveTableOrder(openTable.id, cart, customerName, opts)}
            onGenerateBill={(cart, customerName, totals, paymentMode, phone, redeemedPoints, splitBreakdown) =>
              generateBillForTable(openTable.id, cart, customerName, totals, paymentMode, phone, redeemedPoints, splitBreakdown)
            }
            onSetStatus={(status) => setTableStatus(openTable.id, status)}
            onDeleteTable={(tableId) => {
              deleteTable(tableId);
              setOpenTableId(null);
            }}
            onTransferTable={(fromId, toId) => transferTable(fromId, toId)}
            onMergeTable={(sourceId, targetId) => mergeTables(sourceId, targetId)}
            onSplitTable={(sourceId, targetId, items) => splitTable(sourceId, targetId, items)}
          />
        </Suspense>
      )}
      {qrTable && (
        <Suspense fallback={null}>
          <TableQRModal table={qrTable} onClose={() => setQrTableId(null)} />
        </Suspense>
      )}
      {showCalc && <Calculator onClose={() => setShowCalc(false)} />}
      {showSettings && (
        <Suspense fallback={null}>
          <SettingsPanel
            state={state}
            dispatch={(actionName, ...args) => update((s) => actions[actionName](s, ...args))}
            users={state.users}
            onAddUser={addUser}
            onRemoveUser={removeUser}
            onClose={() => setShowSettings(false)}
            currentUser={currentUser}
            onNavigate={(targetTab) => setTab(targetTab)}
          />
        </Suspense>
      )}

      {showChangePin && (
        <ChangePinModal
          isOpen={showChangePin}
          onClose={() => setShowChangePin(false)}
          currentUser={currentUser}
          onPinChanged={(newPin) => {
            toaster.push("Security PIN updated.", "success");
            setCurrentUser((prev) => (prev ? { ...prev, pin: newPin } : prev));
          }}
        />
      )}

      <Toaster toaster={toaster} />
    </div>
  );
}
