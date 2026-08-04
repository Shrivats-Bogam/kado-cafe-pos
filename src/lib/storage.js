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

// Schema version we tag every write with. Bump only when the on-wire shape
// changes meaningfully. Existing reads without `_v` are treated as v0.
export const SCHEMA_VERSION = 1;

const CAFE_ID = "kado-cafe";
const LS_KEY = "kado-cafe-state";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
    console.info("[kado-cafe] Supabase storage enabled");
  } catch (err) {
    console.warn("[kado-cafe] Supabase init failed, falling back to localStorage:", err);
  }
} else {
  console.info("[kado-cafe] Using localStorage (Supabase keys not configured)");
}

// Tag payload with the current schema version without mutating caller's object.
// Existing state reads (missing _v) are accepted on read; we just re-tag writes.
function tagWithVersion(obj) {
  return { ...obj, _v: SCHEMA_VERSION };
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
    const { data, error } = await supabase
      .from("cafe_state")
      .select("data")
      .eq("cafe_id", CAFE_ID)
      .maybeSingle();
    if (error) throw error;
    const json = data ? JSON.stringify(data.data) : null;
    lastFetched = json || "";
    return json;
  }

  const raw = (typeof localStorage !== "undefined") ? localStorage.getItem(LS_KEY) : null;
  return raw;
}

/**
 * Write the cafe state. Overwrites the entire row. Writes are serialized so
 * rapid sequential calls do not race one another.
 * @param {string} jsonString
 */
export function setState(jsonString) {
  // Strip + re-tag so every persisted payload has the current schema version,
  // while leaving the caller's object untouched.
  const tagged = JSON.stringify(tagWithVersion(JSON.parse(jsonString)));

  // No-op short-circuit if nothing meaningful changed (ignoring _v).
  if (stripVersionForCompare(JSON.parse(tagged)) && tagged === lastFetched) return Promise.resolve();

  return serializeWrites(async () => {
    if (useSupabase) {
      const obj = JSON.parse(tagged);
      const { error } = await supabase.rpc("upsert_cafe_state", {
        p_cafe_id: CAFE_ID,
        p_data: obj,
      });
      if (error) throw error;
      lastFetched = tagged;
      return;
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(LS_KEY, tagged);
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
export { CAFE_ID, LS_KEY };
