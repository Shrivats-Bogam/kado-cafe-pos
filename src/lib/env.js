// env.js — Environment configuration & E2E account isolation guard

const processEnv = typeof process !== "undefined" && process.env ? process.env : {};
const windowEnv = (typeof window !== "undefined" && (window.__KADO_APP_ENV || (window.location && window.location.search.includes("env=e2e")))) ? "e2e" : null;
const metaEnv = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};
export const APP_ENV =
  processEnv.VITE_APP_ENV ||
  processEnv.APP_ENV ||
  metaEnv.VITE_APP_ENV ||
  windowEnv ||
  (metaEnv.MODE === "production" ? "production" : "development");
export const IS_PRODUCTION = APP_ENV === "production";
export const IS_E2E = APP_ENV === "e2e" || APP_ENV === "test";

/**
 * Identifies whether an employee or user record is an E2E test account
 * @param {object} account 
 * @returns {boolean} True if record contains E2E test markers
 */
export function isTestAccount(account) {
  if (!account) return false;
  const name = String(account.name || "").trim();
  const id = String(account.id || "").trim();
  const email = String(account.email || "").trim();

  const e2ePattern = /^E2E[_\s-]?/i;
  const containsE2E = /e2e/i.test(name) || /e2e/i.test(id) || /e2e/i.test(email);

  return e2ePattern.test(name) || e2ePattern.test(id) || containsE2E;
}

/**
 * Filters out test accounts when running in production mode
 * @param {Array} accounts 
 * @returns {Array}
 */
export function filterProductionAccounts(accounts) {
  if (!Array.isArray(accounts)) return [];
  // In production mode (or any non-e2e environment), strictly filter out test accounts
  if (!IS_E2E) {
    return accounts.filter(acc => !isTestAccount(acc));
  }
  return accounts;
}

/**
 * Identifies whether a dining table record is an E2E test artifact
 * @param {object} table 
 * @returns {boolean} True if table matches E2E test prefixes
 */
export function isE2ETable(table) {
  if (!table) return false;
  const name = String(table.name || "").trim();
  const id = String(table.id || "").trim();

  const testPrefixes = [
    "E2E_B02_", "E2E_B03_", "E2E_B04_", "E2E_B05_",
    "B02_T_", "B03_T_", "B04_T_", "B05_T_",
    "E2E_Table", "E2E_T_"
  ];

  return testPrefixes.some(prefix => name.startsWith(prefix) || id.startsWith(prefix)) ||
         /^E2E_/i.test(name) || /^E2E_/i.test(id);
}

/**
 * Safely removes E2E artifact tables when running in E2E environment ONLY.
 * Production hydration must NEVER automatically delete records.
 * @param {Array} tables 
 * @returns {Array} Cleaned tables list in E2E mode; untouched tables list in production mode.
 */
export function cleanupE2ETables(tables) {
  if (!Array.isArray(tables)) return [];
  // Strict check: Only perform cleanup when explicitly running in E2E environment
  if (IS_E2E) {
    return tables.filter(t => !isE2ETable(t));
  }
  // In production mode, NEVER automatically delete tables or records
  return tables;
}
