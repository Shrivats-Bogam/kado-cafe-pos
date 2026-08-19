// Backup, Validation, Safety Snapshot & Disaster Recovery Engine 1.0

import { defaultState } from "../data/defaults.js";
import { computeRevenueMetrics } from "./reportsAggregate.js";

export const BACKUP_MARKER = "KADO_CAFE_BACKUP";
export const BACKUP_VERSION = 1;
export const SCHEMA_VERSION = 1;
export const APP_VERSION = "1.0.0";
export const SNAPSHOT_PREFIX = "kado_cafe_snapshot_";
export const MAX_SNAPSHOTS = 5;

/**
 * Generate a simple deterministic checksum for payload integrity verification.
 */
export function computeChecksum(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return "chk_" + Math.abs(hash).toString(36) + "_" + str.length;
}

/**
 * Extract business-critical whitelisted entities from application state.
 * Strips raw secrets, temporary browser states, and transient UI flags.
 */
import { CAFE_ID } from "./storage.js";

export function buildBackupPayload(state = {}) {
  const {
    settings = {},
    tables = [],
    menuItems = [],
    categories = [],
    parcels = [],
    orders = [],
    pendingBills = [],
    payments = [],
    refunds = [],
    orderHistory = [],
    customers = [],
    customerFeedback = [],
    assistanceRequests = [],
    employees = [],
    users = [],
    rolePermissions = {},
    shifts = [],
    activityLogs = [],
    expenses = [],
    inventory = [],
    recipes = {},
    inventoryLogs = []
  } = state;

  const safeSettings = { ...settings };
  const safeEmployees = (employees || []).map(({ ...emp }) => emp);

  const dataPayload = {
    settings: safeSettings,
    tables,
    menuItems,
    categories,
    parcels,
    orders,
    pendingBills,
    payments,
    refunds,
    orderHistory,
    customers,
    customerFeedback,
    assistanceRequests,
    employees: safeEmployees,
    users,
    rolePermissions,
    shifts,
    activityLogs,
    expenses,
    inventory,
    recipes,
    inventoryLogs
  };

  const payloadString = JSON.stringify(dataPayload);
  const checksum = computeChecksum(payloadString);

  return {
    backupMarker: BACKUP_MARKER,
    backupVersion: BACKUP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    applicationVersion: APP_VERSION,
    cafe_id: CAFE_ID,
    state_version: state.state_version || 1,
    updated_at: state.updated_at || new Date().toISOString(),
    backupId: "bkp_" + Date.now(),
    createdAt: new Date().toISOString(),
    checksum,
    data: dataPayload
  };
}

import { IS_E2E } from "./env.js";

/**
 * Validate a backup object prior to restoration.
 * Returns { valid: boolean, errors: Array<string>, summary: Object|null }
 */
export function validateBackupPayload(backupObj, targetCafeId = CAFE_ID) {
  const errors = [];

  if (!backupObj || typeof backupObj !== "object") {
    return { valid: false, errors: ["Invalid backup payload format."], summary: null };
  }

  if (backupObj.backupMarker !== BACKUP_MARKER) {
    errors.push("Invalid backup marker. File is not a recognized Kado Cafe backup.");
  }

  if (backupObj.schemaVersion && backupObj.schemaVersion > SCHEMA_VERSION) {
    errors.push("Incompatible backup schema version.");
  }

  // Cross-environment / Cross-cafe Safety Check
  const effectiveTargetCafeId = targetCafeId || CAFE_ID;
  if (backupObj.cafe_id && effectiveTargetCafeId && backupObj.cafe_id !== effectiveTargetCafeId) {
    errors.push(`Backup cafe_id "${backupObj.cafe_id}" does not match target environment cafe_id "${effectiveTargetCafeId}". Restoration rejected for safety.`);
  }
  if (IS_E2E && backupObj.cafe_id === "kado-cafe") {
    errors.push("Production backup cannot be restored into an E2E test environment.");
  }

  if (!backupObj.data || typeof backupObj.data !== "object") {
    errors.push("Backup file is missing core data payload.");
  } else {
    const d = backupObj.data;
    if (!Array.isArray(d.orderHistory)) errors.push("Backup data is missing or corrupted orderHistory array.");
    if (!Array.isArray(d.customers)) errors.push("Backup data is missing or corrupted customers array.");
    if (!Array.isArray(d.menuItems)) errors.push("Backup data is missing or corrupted menuItems array.");
    if (!Array.isArray(d.inventory)) errors.push("Backup data is missing or corrupted inventory array.");
    if (!Array.isArray(d.employees)) errors.push("Backup data is missing or corrupted employees array.");
    if (!Array.isArray(d.tables)) errors.push("Backup data is missing or corrupted tables array.");
    if (d.recipes && typeof d.recipes !== "object") errors.push("Backup data contains corrupted recipes object.");

    // Integrity Checksum Validation
    if (backupObj.checksum) {
      const computed = computeChecksum(JSON.stringify(d));
      if (computed !== backupObj.checksum) {
        errors.push("Checksum mismatch. Backup file may be corrupted or modified.");
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, summary: null };
  }

  const d = backupObj.data;
  const metrics = computeRevenueMetrics(d.orderHistory || []);

  const summary = {
    customersCount: (d.customers || []).length,
    ordersCount: (d.orderHistory || []).length,
    paidBillsCount: metrics.paidCount,
    netRevenue: metrics.paidRevenue,
    tablesCount: (d.tables || []).length,
    menuItemsCount: (d.menuItems || []).length,
    inventoryCount: (d.inventory || []).length,
    recipesCount: Object.keys(d.recipes || {}).length,
    employeesCount: (d.employees || []).length,
    createdAt: backupObj.createdAt,
    backupId: backupObj.backupId,
    cafe_id: backupObj.cafe_id || CAFE_ID
  };

  return { valid: true, errors: [], summary };
}

/**
 * Create an automatic safety snapshot of current application state before restore.
 */
export function createPreRestoreSnapshot(state = {}) {
  if (typeof localStorage === "undefined") return null;

  try {
    const timestamp = Date.now();
    const snapshotKey = `${SNAPSHOT_PREFIX}${timestamp}`;
    const payload = buildBackupPayload(state);
    localStorage.setItem(snapshotKey, JSON.stringify(payload));

    // Maintain snapshot registry (Max 5 snapshots)
    const listRaw = localStorage.getItem("kado_cafe_snapshots_registry");
    let registry = listRaw ? JSON.parse(listRaw) : [];
    registry.unshift({
      key: snapshotKey,
      timestamp: new Date().toISOString(),
      backupId: payload.backupId,
      ordersCount: (state.orderHistory || []).length,
      customersCount: (state.customers || []).length
    });

    // Prune old snapshots beyond MAX_SNAPSHOTS
    if (registry.length > MAX_SNAPSHOTS) {
      const toRemove = registry.slice(MAX_SNAPSHOTS);
      toRemove.forEach((s) => localStorage.removeItem(s.key));
      registry = registry.slice(0, MAX_SNAPSHOTS);
    }

    localStorage.setItem("kado_cafe_snapshots_registry", JSON.stringify(registry));
    return snapshotKey;
  } catch (err) {
    console.error("[kado-cafe] Failed to create safety snapshot:", err);
    return null;
  }
}

/**
 * Get list of available local pre-restore safety snapshots.
 */
export function getSafetySnapshots() {
  if (typeof localStorage === "undefined") return [];
  try {
    const listRaw = localStorage.getItem("kado_cafe_snapshots_registry");
    return listRaw ? JSON.parse(listRaw) : [];
  } catch {
    return [];
  }
}

/**
 * Run post-restore consistency & financial reconciliation audit.
 */
export function verifyRestoredState(restoredState = {}) {
  const issues = [];
  const orders = restoredState.orderHistory || [];
  const customers = restoredState.customers || [];
  const inventoryLogs = restoredState.inventoryLogs || [];

  // Check ID Uniqueness
  const orderIds = new Set();
  orders.forEach((o) => {
    if (orderIds.has(o.id)) issues.push(`Duplicate Order ID found: ${o.id}`);
    orderIds.add(o.id);
  });

  const custIds = new Set();
  customers.forEach((c) => {
    if (custIds.has(c.id)) issues.push(`Duplicate Customer ID found: ${c.id}`);
    custIds.add(c.id);
  });

  // Financial Reconciliation
  const metrics = computeRevenueMetrics(orders);
  if (isNaN(metrics.paidRevenue)) issues.push("Financial reconciliation error: Revenue total is NaN.");

  return {
    passed: issues.length === 0,
    issues,
    metrics
  };
}
