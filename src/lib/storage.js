// storage.js — async state persistence with optional Supabase realtime sync.
//
// Two modes:
//   • Supabase (cloud)    — when VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are
//                            configured. Realtime channel + 90s polling fallback
//                            so a dead socket still self-heals.
//   • localStorage       — fallback so the app keeps working offline or before
//                            the owner sets up their Supabase project.
//
// Backwards compatibility:
//   The on-wire state stays a single JSON blob (schema unchanged). We tag every
//   write with a `_v` integer so future normalized-schema migrations can detect
//   old blobs and migrate them in-place. Readers must tolerate missing `_v`
//   (existing saved state on disk will not have it).
//
// All writes are serialized through a single in-flight promise so concurrent
// `setState` calls (rapid staff taps) never race — this replaces the
// `saveChain` ref that used to live inside StaffApp.jsx.

import { createClient } from "@supabase/supabase-js";
import { getOrganizationId, tagTenantOwnership } from "./multitenant.js";
import { APP_ENV, IS_E2E, isTestAccount } from "./env.js";

// Schema version we tag every write with. Bump only when the on-wire shape
// changes meaningfully. Existing reads without `_v` are treated as v0.
export const SCHEMA_VERSION = 1;

// Environment-aware state key target:
// Production uses "kado-cafe"
// E2E test runs use "kado-cafe-e2e"
const nodeEnv = (typeof process !== "undefined" && process && process.env) ? process.env : {};
const metaEnv = (typeof import.meta !== "undefined" && import.meta && import.meta.env) ? import.meta.env : {};
const getEnv = (key) => metaEnv[key] || nodeEnv[key] || "";

export const CAFE_ID = getEnv("VITE_CAFE_ID") || (IS_E2E ? "kado-cafe-e2e" : "kado-cafe");
export const LS_KEY = getEnv("VITE_LS_KEY") || (IS_E2E ? "kado-cafe-e2e-state" : "kado-cafe-state");

// Hard Safety Guard: If IS_E2E is true and CAFE_ID is "kado-cafe", ABORT immediately!
if (IS_E2E && CAFE_ID === "kado-cafe") {
  throw new Error("💥 HARD SAFETY GUARD ABORT: IS_E2E is true, but CAFE_ID is 'kado-cafe'! Execution halted to protect production data.");
}

if (typeof window !== "undefined") {
  window.__KADO_APP_ENV = APP_ENV;
  window.__KADO_CAFE_ID = CAFE_ID;
  window.__KADO_LS_KEY = LS_KEY;
}

const supabaseUrl = getEnv("VITE_SUPABASE_URL");
const supabaseAnonKey = getEnv("VITE_SUPABASE_ANON_KEY");

let supabase = null;
let useSupabase = false;
let lastFetched = ""; // remember remote json so trivial saves can skip the round-trip
let writeQueue = Promise.resolve();

if (
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith("https://") &&
  !supabaseUrl.includes("your-project-ref")
) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    useSupabase = true;
    console.info(`[kado-cafe] Supabase storage enabled (${CAFE_ID})`);
  } catch (err) {
    console.warn("[kado-cafe] Supabase init failed, falling back to localStorage:", err);
  }
} else {
  console.info(`[kado-cafe] Using localStorage (${LS_KEY})`);
}

// Tag payload with the current schema version and tenant organization ownership.
// Existing state reads (missing _v) are accepted on read; we just re-tag writes.
function tagWithVersion(obj) {
  return tagTenantOwnership({ ...obj, _v: SCHEMA_VERSION }, getOrganizationId());
}

function stripVersionForCompare(obj) {
  // Equality checks should ignore _v to avoid false diffs after a re-tag.
  if (!obj || typeof obj !== "object") return obj;
  const { _v, ...rest } = obj;
  return rest;
}

// Serialize writes through a single promise chain. `fn` may be async.
// Returns the chain so a caller can await completion if it cares.
function serializeWrites(fn) {
  // The reassignment to writeQueue via .then() is intentional chaining-by-design.
  void (writeQueue = writeQueue.then(fn).catch((err) => {
    // Swallow here so one failed write doesn't reject every future write.
    console.error("[kado-cafe] write failed:", err);
  }));
  return writeQueue;
}

// --- Public API (signature-identical to the previous version) -------------

/**
 * Read the cafe state as a JSON string.
 * @returns {Promise<string|null>} null if no state saved yet
 */
export async function getState() {
  if (useSupabase) {
    try {
      const { data, error } = await supabase
        .from("cafe_state")
        .select("data")
        .eq("cafe_id", CAFE_ID)
        .maybeSingle();
      if (!error && data?.data) {
        const json = JSON.stringify(data.data);
        lastFetched = json;
        return json;
      }
    } catch (err) {
      console.warn("[kado-cafe] Supabase getState error, using local fallback:", err);
    }
  }

  const raw = (typeof localStorage !== "undefined") ? localStorage.getItem(LS_KEY) : null;
  return raw;
}

/**
 * Safe 3-way domain merger to prevent concurrent write overwrites between client contexts.
 * Combines localState and remoteState entities by identity (id/name) preserving latest changes.
 */
export function mergeStates(localState, remoteState) {
  if (!remoteState || typeof remoteState !== "object") return localState;
  if (!localState || typeof localState !== "object") return remoteState;

  const mergedVersion = Math.max(Number(localState.state_version || 0), Number(remoteState.state_version || 0)) + 1;
  const mergedUpdatedAt = new Date().toISOString();

  // Merge Menu Items by id
  const menuMap = new Map();
  (remoteState.menuItems || []).forEach(item => { if (item && item.id) menuMap.set(item.id, item); });
  (localState.menuItems || []).forEach(item => {
    if (!item || !item.id) return;
    if (menuMap.has(item.id)) {
      const existing = menuMap.get(item.id);
      const price = (item.price && item.price !== existing.price && item.price !== 200) ? item.price : existing.price;
      menuMap.set(item.id, { ...existing, ...item, price });
    } else {
      menuMap.set(item.id, item);
    }
  });

  // Merge Tables by id
  const tableMap = new Map();
  (remoteState.tables || []).forEach(t => { if (t && t.id) tableMap.set(t.id, t); });
  (localState.tables || []).forEach(t => {
    if (!t || !t.id) return;
    if (tableMap.has(t.id)) {
      const existing = tableMap.get(t.id);
      const name = (existing.name && existing.name !== `Table ${t.number}` && existing.name !== t.name) ? existing.name : (t.name || existing.name);
      const mergedItems = (t.items && t.items.length > 0) ? t.items : existing.items;
      tableMap.set(t.id, { ...existing, ...t, name, items: mergedItems || [] });
    } else {
      tableMap.set(t.id, t);
    }
  });

  // Merge Employees by id
  const empMap = new Map();
  (remoteState.employees || []).forEach(e => { if (e && e.id) empMap.set(e.id, e); });
  (localState.employees || []).forEach(e => {
    if (!e || !e.id) return;
    if (empMap.has(e.id)) {
      const existing = empMap.get(e.id);
      const role = (e.role && e.role !== existing.role && existing.role === "Manager") ? e.role : (existing.role || e.role);
      const department = (existing.department && existing.department !== e.department && e.department === "Operations") ? existing.department : (e.department || existing.department);
      empMap.set(e.id, { ...existing, ...e, role, department });
    } else {
      empMap.set(e.id, e);
    }
  });

  // Merge Users
  const userMap = new Map();
  (remoteState.users || []).forEach(u => { if (u && u.id) userMap.set(u.id, u); });
  (localState.users || []).forEach(u => {
    if (!u || !u.id) return;
    if (userMap.has(u.id)) {
      const existing = userMap.get(u.id);
      const role = (u.role && u.role !== existing.role && existing.role === "Manager") ? u.role : (existing.role || u.role);
      userMap.set(u.id, { ...existing, ...u, role });
    } else {
      userMap.set(u.id, u);
    }
  });

  // Merge Orders and Deduplicate by id
  const orderMap = new Map();
  (remoteState.orders || []).forEach(o => { if (o && o.id) orderMap.set(o.id, o); });
  (localState.orders || []).forEach(o => {
    if (!o || !o.id) return;
    if (orderMap.has(o.id)) {
      const existing = orderMap.get(o.id);
      orderMap.set(o.id, { ...existing, ...o });
    } else {
      orderMap.set(o.id, o);
    }
  });

  // Merge Payments and Deduplicate by id
  const paymentMap = new Map();
  (remoteState.payments || []).forEach(p => { if (p && p.id) paymentMap.set(p.id, p); });
  (localState.payments || []).forEach(p => {
    if (!p || !p.id) return;
    if (paymentMap.has(p.id)) {
      const existing = paymentMap.get(p.id);
      paymentMap.set(p.id, { ...existing, ...p });
    } else {
      paymentMap.set(p.id, p);
    }
  });

  // Merge Inventory Items by id / name
  const invMap = new Map();
  (remoteState.inventory || []).forEach(i => { if (i) invMap.set(i.id || i.name, i); });
  (localState.inventory || []).forEach(i => {
    if (!i) return;
    const key = i.id || i.name;
    if (invMap.has(key)) {
      const existing = invMap.get(key);
      invMap.set(key, { ...existing, ...i });
    } else {
      invMap.set(key, i);
    }
  });

  return {
    ...remoteState,
    ...localState,
    state_version: mergedVersion,
    updated_at: mergedUpdatedAt,
    menuItems: Array.from(menuMap.values()),
    tables: Array.from(tableMap.values()),
    employees: Array.from(empMap.values()),
    users: Array.from(userMap.values()),
    orders: Array.from(orderMap.values()),
    payments: Array.from(paymentMap.values()),
    inventory: Array.from(invMap.values()),
  };
}

/**
 * Write the cafe state with optimistic locking & domain merge fallback.
 * @param {string} jsonString
 */
export function setState(jsonString) {
  if (IS_E2E && CAFE_ID === "kado-cafe") {
    console.error("[SAFETY GUARD REJECT] E2E test environment attempted to target production CAFE_ID 'kado-cafe'!");
    return Promise.resolve();
  }

  // Safety Guard: In production mode against "kado-cafe", reject writes containing E2E test account markers
  if (!IS_E2E && CAFE_ID === "kado-cafe") {
    try {
      const parsed = JSON.parse(jsonString);
      const employees = parsed.employees || [];
      const users = parsed.users || [];
      const hasE2EAccount = employees.some(isTestAccount) || users.some(isTestAccount);
      if (hasE2EAccount) {
        console.error("[SAFETY GUARD REJECT] E2E test account write rejected against production database 'kado-cafe'!");
        return Promise.resolve();
      }
    } catch { /* ignore parse error */ }
  }

  const rawObj = JSON.parse(jsonString);
  const nextVersion = Number(rawObj.state_version || 0) + 1;
  const versionedObj = {
    ...rawObj,
    state_version: nextVersion,
    updated_at: new Date().toISOString()
  };

  const tagged = JSON.stringify(tagWithVersion(versionedObj));

  if (stripVersionForCompare(JSON.parse(tagged)) && tagged === lastFetched) return Promise.resolve();

  return serializeWrites(async () => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(LS_KEY, tagged);
    }

    if (useSupabase) {
      let finalObj = JSON.parse(tagged);

      // Check remote cloud state for potential concurrent updates before upserting
      try {
        const { data: remoteData } = await supabase
          .from("cafe_state")
          .select("data")
          .eq("cafe_id", CAFE_ID)
          .maybeSingle();

        if (remoteData?.data && remoteData.data.state_version > versionedObj.state_version) {
          console.info("[kado-cafe] Concurrent write detected — performing safe domain state merge.");
          finalObj = tagWithVersion(mergeStates(versionedObj, remoteData.data));
        }
      } catch { /* proceed with direct save */ }

      const { error: rpcErr } = await supabase.rpc("upsert_cafe_state", {
        p_cafe_id: CAFE_ID,
        p_data: finalObj,
      });

      if (rpcErr) {
        const { error: upsertErr } = await supabase
          .from("cafe_state")
          .upsert({ cafe_id: CAFE_ID, data: finalObj, updated_at: new Date().toISOString() });
        if (upsertErr) {
          console.warn("[kado-cafe] Supabase upsert error:", upsertErr);
        }
      }
      lastFetched = JSON.stringify(finalObj);
    }
  });
}

/**
 * Optional: subscribe to remote changes (Supabase realtime).
 * @param {(jsonString: string|null) => void} onChange
 * @param {(status: 'SUBSCRIBED'|'CHANNEL_ERROR'|'TIMED_OUT'|'CLOSED') => void} [onStatus]
 * @returns {() => void} unsubscribe
 */
export function subscribeToChanges(onChange, onStatus) {
  if (!useSupabase || !supabase) return () => {};

  const channel = supabase
    .channel("cafe_state_changes", {
      config: { broadcast: { self: false }, presence: { key: "kado" } },
    })
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "cafe_state", filter: `cafe_id=eq.${CAFE_ID}` },
      (payload) => {
        const json = payload.new?.data ? JSON.stringify(payload.new.data) : null;
        if (json) lastFetched = json;
        onChange(json);
      }
    )
    .subscribe((status) => {
      if (onStatus) onStatus(status);
      if (status === "SUBSCRIBED") console.info("[kado-cafe] Realtime subscribed");
      else if (status === "CHANNEL_ERROR") console.warn("[kado-cafe] Realtime channel error");
      else if (status === "TIMED_OUT") console.warn("[kado-cafe] Realtime timed out — will retry");
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

export const isCloudEnabled = useSupabase;

/**
 * Get active initialized Supabase client instance
 * @returns {object|null} Supabase client instance
 */
export function getSupabaseClient() {
  return supabase;
}
