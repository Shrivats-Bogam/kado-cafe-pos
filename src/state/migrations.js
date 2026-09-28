// src/state/migrations.js
// Automated schema migration runner for Kado Cafe POS.
// Ensures backward compatibility across app updates by upgrading legacy stored states.

import { defaultRolePermissions, defaultSettings } from "../data/defaults.js";

export const CURRENT_SCHEMA_VERSION = 2;

/**
 * Migration from v0 (unversioned legacy state) to v1
 * - Initializes essential arrays (shifts, activityLogs, recipes, inventoryLogs)
 * - Sets up default rolePermissions RBAC matrix if absent
 * - Ensures every user has id, role, and pin
 */
export function migrateV0ToV1(state) {
  const s = { ...state };

  if (!Array.isArray(s.employees)) s.employees = [];
  if (!Array.isArray(s.users)) s.users = [];
  if (!Array.isArray(s.shifts)) s.shifts = [];
  if (!Array.isArray(s.activityLogs)) s.activityLogs = [];
  if (!Array.isArray(s.inventoryLogs)) s.inventoryLogs = [];
  if (!Array.isArray(s.orderHistory)) s.orderHistory = [];
  if (!Array.isArray(s.customers)) s.customers = [];
  if (!s.recipes || typeof s.recipes !== "object") s.recipes = {};

  // Standardize RBAC matrix
  const basePermissions = defaultRolePermissions();
  s.rolePermissions = {
    ...basePermissions,
    ...(s.rolePermissions || {})
  };

  // Ensure default Owner and Manager in users if completely empty
  if (s.users.length === 0 && s.employees.length === 0) {
    s.users = [
      { id: "u_owner", name: "Owner", pin: "1234", role: "Owner", active: true },
      { id: "u_manager", name: "Manager", pin: "0000", role: "Manager", active: true }
    ];
  }

  s._v = 1;
  return s;
}

/**
 * Migration from v1 to v2:
 * - Ensures every employee has a valid employeeId (e.g. EMP-101)
 * - Trims PINs and enforces string type
 * - Enforces zero-floor on inventory stock (no negative inventory)
 * - Populates missing settings keys with system defaults
 * - Initializes refunds, payments, and archival metadata
 */
export function migrateV1ToV2(state) {
  const s = { ...state };

  // Standardize employees: employeeId, string PINs, clean status
  if (Array.isArray(s.employees)) {
    s.employees = s.employees.map((emp, index) => ({
      ...emp,
      id: emp.id || `emp_${index + 1}`,
      employeeId: emp.employeeId || `EMP-${101 + index}`,
      name: emp.name || "Staff Member",
      pin: String(emp.pin || "0000").trim(),
      role: emp.role || "Staff",
      status: emp.status || "active"
    }));
  }

  // Standardize inventory: clamp negative stock to 0 floor
  if (Array.isArray(s.inventory)) {
    s.inventory = s.inventory.map(item => ({
      ...item,
      currentStock: Math.max(0, Number(item.currentStock) || 0),
      minStock: Math.max(0, Number(item.minStock) || 0),
      unit: (item.unit || "pcs").toLowerCase().trim()
    }));
  }

  // Populate settings with latest system defaults
  const defSettings = defaultSettings();
  s.settings = {
    ...defSettings,
    ...(s.settings || {})
  };

  // Archival and financial records initialization
  if (!Array.isArray(s.refunds)) s.refunds = [];
  if (!Array.isArray(s.payments)) s.payments = [];
  if (typeof s.archivedOrdersCount !== "number") s.archivedOrdersCount = 0;

  s._v = 2;
  return s;
}

const MIGRATIONS = [
  { version: 1, run: migrateV0ToV1 },
  { version: 2, run: migrateV1ToV2 },
];

/**
 * Executes all pending schema migrations sequentially against a state object.
 *
 * @param {object} rawState Saved state payload from local storage or cloud
 * @returns {{ state: object, migrated: boolean, fromVersion: number, toVersion: number }}
 */
export function runSchemaMigrations(rawState) {
  if (!rawState || typeof rawState !== "object") {
    return { state: rawState, migrated: false, fromVersion: 0, toVersion: CURRENT_SCHEMA_VERSION };
  }

  const fromVersion = Number(rawState._v || rawState.schema_version || 0);
  let currentState = { ...rawState };
  let migrated = false;

  for (const step of MIGRATIONS) {
    if (fromVersion < step.version) {
      console.info(`[kado-cafe] Running schema migration to v${step.version}...`);
      currentState = step.run(currentState);
      migrated = true;
    }
  }

  currentState._v = CURRENT_SCHEMA_VERSION;
  return {
    state: currentState,
    migrated,
    fromVersion,
    toVersion: CURRENT_SCHEMA_VERSION
  };
}
