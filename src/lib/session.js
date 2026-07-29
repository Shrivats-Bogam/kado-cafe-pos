// Tiny session persists the currently logged-in user (and a few UI bytes like
// the active tab) in localStorage so a browser refresh doesn't kick you back
// to the login screen. PIN-only auth is per-device; a session has no expiry
// for now (you click Logout to clear it).

const SESSION_KEY = "kado-cafe-session";

export function saveSession(user) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch { /* storage full / disabled — non-fatal */ }
}

export function loadSession() {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearSession() {
  if (typeof localStorage === "undefined") return;
  try { localStorage.removeItem(SESSION_KEY); } catch { /* non-fatal */ }
}

// UI state we want to restore (active tab, last open table, last cart) also
// lives in localStorage. Stored separately from the Supabase state blob so we
// can restore the screen even when the user reloads mid-order.
const UI_KEY = "kado-cafe-ui";

export function saveUIState(ui) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(ui));
  } catch { /* non-fatal */ }
}

export function loadUIState() {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(UI_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearUIState() {
  if (typeof localStorage === "undefined") return;
  try { localStorage.removeItem(UI_KEY); } catch { /* non-fatal */ }
}
