// auth.js — Supabase Auth identity manager & organization membership resolver

import {
  setOrganizationId,
  getOrganizationId,
  DEFAULT_ORGANIZATION_ID,
} from "./multitenant.js";

const SESSION_KEY = "kado-cafe-auth-session";

let currentSession = null;
let currentMemberProfile = null;

/**
 * Initialize / restore active authentication session & organization membership
 * @param {object} [supabaseClient] Optional Supabase client instance
 * @returns {Promise<object>} Resolved auth session object
 */
export async function initializeAuthSession(supabaseClient = null) {
  try {
    // 1. Check local session cache
    const cached = getCachedAuthSession();
    if (cached && cached.user && cached.organization_id) {
      setOrganizationId(cached.organization_id);
      currentSession = cached;
      currentMemberProfile = cached.member;
      return cached;
    }

    // 2. If Supabase client available, query active Supabase Auth user session
    if (supabaseClient && typeof supabaseClient.auth?.getSession === "function") {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      if (!error && session?.user) {
        const membership = await resolveOrganizationMembership(supabaseClient, session.user.id);
        if (membership) {
          setOrganizationId(membership.organization_id);
          const authData = {
            user: session.user,
            organization_id: membership.organization_id,
            role: membership.role,
            member: membership,
          };
          saveCachedAuthSession(authData);
          currentSession = authData;
          currentMemberProfile = membership;
          return authData;
        }
      }
    }
  } catch (err) {
    console.warn("[kado-cafe] Auth initialization error, falling back to local session:", err);
  }

  // 3. Fallback to default single-café tenant organization
  setOrganizationId(DEFAULT_ORGANIZATION_ID);
  const fallbackSession = {
    user: { id: "local-user-owner", email: "owner@kado.cafe" },
    organization_id: DEFAULT_ORGANIZATION_ID,
    role: "Owner",
    member: { id: "mem-owner", name: "Cafe Owner", role: "Owner", active: true },
  };
  currentSession = fallbackSession;
  currentMemberProfile = fallbackSession.member;
  return fallbackSession;
}

/**
 * Query organization_members table to resolve user's tenant organization & role
 * @param {object} supabaseClient 
 * @param {string} userId 
 * @returns {Promise<object|null>}
 */
export async function resolveOrganizationMembership(supabaseClient, userId) {
  if (!supabaseClient || !userId) return null;
  try {
    const { data, error } = await supabaseClient
      .from("organization_members")
      .select("id, organization_id, user_id, name, role, active")
      .eq("user_id", userId)
      .eq("active", true)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Login user using email credentials
 * @param {object} supabaseClient 
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<object>}
 */
export async function loginWithEmail(supabaseClient, email, password) {
  if (!supabaseClient || !supabaseClient.auth) {
    throw new Error("Cloud auth service not available");
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    throw new Error(error?.message || "Invalid credentials");
  }

  const membership = await resolveOrganizationMembership(supabaseClient, data.user.id);
  if (!membership) {
    throw new Error("No active organization membership found for this user account");
  }

  setOrganizationId(membership.organization_id);
  const sessionData = {
    user: data.user,
    organization_id: membership.organization_id,
    role: membership.role,
    member: membership,
  };

  saveCachedAuthSession(sessionData);
  currentSession = sessionData;
  currentMemberProfile = membership;
  return sessionData;
}

/**
 * Log out user, clear tokens, and reset tenant organization context
 * @param {object} [supabaseClient] 
 */
export async function logoutUser(supabaseClient = null) {
  if (supabaseClient && typeof supabaseClient.auth?.signOut === "function") {
    try { await supabaseClient.auth.signOut(); } catch { /* ignore */ }
  }
  clearCachedAuthSession();
  currentSession = null;
  currentMemberProfile = null;
  setOrganizationId(DEFAULT_ORGANIZATION_ID);
}

/**
 * Get current active session
 * @returns {object|null}
 */
export function getCurrentAuthSession() {
  return currentSession;
}

/**
 * Get current member profile
 * @returns {object|null}
 */
export function getCurrentMemberProfile() {
  return currentMemberProfile;
}

// --- Local Storage Cache Helpers ---

function getCachedAuthSession() {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCachedAuthSession(sessionData) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  } catch { /* storage full */ }
}

function clearCachedAuthSession() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
}
