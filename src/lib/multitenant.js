// multitenant.js — Multi-tenant organization manager & tenant isolation context helper

export const DEFAULT_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001";
export const DEFAULT_ORGANIZATION_NAME = "Kado Cafe Main";

let currentOrganizationId = DEFAULT_ORGANIZATION_ID;

/**
 * Get active tenant organization ID
 * @returns {string} UUID of active organization
 */
export function getOrganizationId() {
  return currentOrganizationId;
}

/**
 * Set active tenant organization ID
 * @param {string} orgId 
 */
export function setOrganizationId(orgId) {
  if (orgId && typeof orgId === "string") {
    currentOrganizationId = orgId;
  }
}

/**
 * Create a new tenant organization object
 * @param {string} name 
 * @param {string} ownerId 
 * @returns {object} Organization record
 */
export function createOrganizationModel(name, ownerId = null) {
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `org-${Date.now()}`;
  return {
    id,
    name: name || "New Cafe",
    owner_id: ownerId,
    status: "active",
    plan: "enterprise",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Enforce tenant isolation on a state blob or domain data record
 * @param {object} record 
 * @param {string} [orgId] 
 * @returns {object} Record stamped with organization_id
 */
export function tagTenantOwnership(record, orgId = currentOrganizationId) {
  if (!record || typeof record !== "object") return record;
  return {
    ...record,
    organization_id: orgId,
  };
}

/**
 * Verify whether a record belongs to the active tenant organization
 * @param {object} record 
 * @param {string} [activeOrgId] 
 * @returns {boolean} True if accessible by current organization
 */
export function validateTenantAccess(record, activeOrgId = currentOrganizationId) {
  if (!record) return false;
  // If record has no organization_id stamped, default single-tenant data is accepted for backwards compatibility
  if (!record.organization_id) return true;
  return record.organization_id === activeOrgId;
}

/**
 * Filter an array of domain records by active tenant organization
 * @param {Array} records 
 * @param {string} [orgId] 
 * @returns {Array} Tenant-isolated records
 */
export function filterTenantRecords(records, orgId = currentOrganizationId) {
  if (!Array.isArray(records)) return [];
  return records.filter((rec) => validateTenantAccess(rec, orgId));
}

/**
 * Role-Based Access Control (RBAC) permission validator
 * Server/Client multi-tenant RBAC permissions matrix:
 * Owner > Manager > Cashier / Staff > Kitchen
 */
export const ROLE_PERMISSIONS = {
  Owner: {
    canRead: true,
    canCreateOrders: true,
    canSettleBills: true,
    canModifyMenu: true,
    canModifyInventory: true,
    canManageEmployees: true,
    canViewReports: true,
    canBackupRestore: true,
  },
  Manager: {
    canRead: true,
    canCreateOrders: true,
    canSettleBills: true,
    canModifyMenu: true,
    canModifyInventory: true,
    canManageEmployees: false,
    canViewReports: true,
    canBackupRestore: false,
  },
  Cashier: {
    canRead: true,
    canCreateOrders: true,
    canSettleBills: true,
    canModifyMenu: false,
    canModifyInventory: false,
    canManageEmployees: false,
    canViewReports: false,
    canBackupRestore: false,
  },
  Kitchen: {
    canRead: true,
    canCreateOrders: false,
    canSettleBills: false,
    canModifyMenu: false,
    canModifyInventory: false,
    canManageEmployees: false,
    canViewReports: false,
    canBackupRestore: false,
  },
};

/**
 * Check if user role has permission to perform action
 * @param {string} role 
 * @param {string} permissionKey 
 * @returns {boolean}
 */
export function hasPermission(role, permissionKey) {
  const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.Cashier;
  return Boolean(perms[permissionKey]);
}
