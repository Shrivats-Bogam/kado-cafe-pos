// src/lib/auth.js — Supabase Auth identity manager & organization membership resolver

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
 * @returns {Promise<object|null>} Resolved auth session object or null if unauthenticated
 */
export async function initializeAuthSession(supabaseClient = null) {
  try {
    // 1. If Supabase client available, query active Supabase Auth user session
    if (supabaseClient && typeof supabaseClient.auth?.getSession === "function") {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      if (!error && session?.user) {
        const membership = await resolveOrganizationMembership(supabaseClient, session.user.id);
        if (membership && membership.active !== false) {
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
        } else {
          // Deactivated user or membership not found
          await logoutUser(supabaseClient);
          return null;
        }
      }
    }
  } catch (err) {
    console.warn("[kado-cafe] Auth initialization error:", err);
  }

  // 2. Unauthenticated state — do NOT fabricate or rely on stale local cache
  clearCachedAuthSession();
  currentSession = null;
  currentMemberProfile = null;
  setOrganizationId(DEFAULT_ORGANIZATION_ID);
  return null;
}

/**
 * Check if the terminal currently has an active Supabase Cloud Auth session
 * @param {object} supabaseClient 
 * @returns {Promise<boolean>}
 */
export async function hasActiveCloudAuth(supabaseClient) {
  if (!supabaseClient || !supabaseClient.auth) return false;
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    return Boolean(!error && session?.user);
  } catch {
    return false;
  }
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
    // 1. Primary: Use self-healing RPC (resolves or auto-creates Owner record)
    if (typeof supabaseClient.rpc === "function") {
      const { data: rpcData, error: rpcErr } = await supabaseClient.rpc("get_my_organization_membership");
      if (!rpcErr && rpcData && rpcData.success) {
        return rpcData;
      }
    }

    // 2. Direct table lookup fallback
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

  if (membership.active === false) {
    throw new Error("Account is disabled or access has been revoked");
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

/**
 * Authenticate employee using PIN code
 * @param {object} employee Employee object containing pin and status
 * @param {string} pin Provided 4-digit PIN string
 * @returns {object} Employee object if valid
 */
export function authenticateLocalPin(employee, pin) {
  if (!employee) throw new Error("Invalid employee");
  if (employee.status === "disabled" || employee.status === "Inactive") {
    throw new Error("Account disabled");
  }
  if (String(employee.pin || "") !== String(pin || "")) {
    throw new Error("Wrong PIN");
  }
  return employee;
}

/**
 * Resolve authoritative employee record from state employees
 * @param {Array} employees State employees list
 * @param {object} user Selected user object
 * @returns {object} Authoritative employee record
 */
export function resolveLocalUserIdentity(employees, user) {
  if (!user) return null;
  const emp = (employees || []).find((e) => (e.id && e.id === user.id) || (e.pin && e.pin === user.pin));
  if (emp && (emp.status === "disabled" || emp.status === "Inactive")) {
    throw new Error("Account disabled");
  }
  return emp || user;
}

/**
 * Build standardized user identity object for authenticated cloud user
 * @param {object} params
 * @returns {object}
 */
export function buildCloudUserIdentity({ user, organization_id, role, member }) {
  if (!user || !organization_id || !role) throw new Error("Invalid cloud user payload");
  return {
    id: user.id,
    email: user.email,
    name: member?.name || user.email?.split("@")[0] || "User",
    organization_id,
    role,
    member,
    isCloud: true,
    active: member?.active !== false
  };
}

/**
 * Manage employee in Supabase Cloud via Edge Function
 * @param {object} supabaseClient
 * @param {object} params { action: 'provision'|'update'|'toggle-status', ... }
 * @returns {Promise<object>}
 */
export async function manageEmployeeCloud(supabaseClient, params) {
  if (!supabaseClient || typeof supabaseClient.functions?.invoke !== "function") {
    return null;
  }
  const { data, error } = await supabaseClient.functions.invoke("manage-employee", {
    body: params,
  });

  if (error) {
    throw new Error(error.message || "Failed to manage employee in cloud");
  }
  if (data && data.success === false) {
    throw new Error(data.error || "Cloud employee operation failed");
  }
  return data?.data || data;
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
