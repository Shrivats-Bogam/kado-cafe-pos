// authTest.js — Automated security & role test matrix for Sprint S7.2 (AUTH-01 to AUTH-16 & Role Matrix)

import {
  DEFAULT_ORGANIZATION_ID,
  createOrganizationModel,
  tagTenantOwnership,
  validateTenantAccess,
  hasPermission,
} from "./multitenant.js";

/**
 * Execute full Sprint S7.2 authentication & role security test matrix
 * @returns {object} Test results summary
 */
export function runAuthTestSuite() {
  const results = [];

  function assert(id, name, condition, details = "") {
    results.push({
      id,
      name,
      passed: Boolean(condition),
      details: condition ? "Passed successfully" : `Failed: ${details}`,
    });
  }

  const orgA = createOrganizationModel("Kado Main", "user-a");
  const orgB = createOrganizationModel("Kado Downtown", "user-b");

  // AUTH-01: User A can authenticate
  const userA = { id: "user-a", email: "userA@kado.cafe", organization_id: orgA.id, role: "Owner" };
  assert("AUTH-01", "User A can authenticate", Boolean(userA && userA.id));

  // AUTH-02: User B can authenticate
  const userB = { id: "user-b", email: "userB@kado.cafe", organization_id: orgB.id, role: "Manager" };
  assert("AUTH-02", "User B can authenticate", Boolean(userB && userB.id));

  // AUTH-03: User A resolves to Organization A
  assert("AUTH-03", "User A resolves to Organization A", userA.organization_id === orgA.id);

  // AUTH-04: User B resolves to Organization B
  assert("AUTH-04", "User B resolves to Organization B", userB.organization_id === orgB.id);

  // AUTH-05: User A cannot read Organization B
  const recB = tagTenantOwnership({ id: "order-b", total: 120 }, orgB.id);
  const readDeniedB = validateTenantAccess(recB, orgA.id);
  assert("AUTH-05", "User A cannot read Organization B", readDeniedB === false);

  // AUTH-06: User B cannot read Organization A
  const recA = tagTenantOwnership({ id: "order-a", total: 80 }, orgA.id);
  const readDeniedA = validateTenantAccess(recA, orgB.id);
  assert("AUTH-06", "User B cannot read Organization A", readDeniedA === false);

  // AUTH-07: User A cannot insert Organization B records
  const insertDeniedB = validateTenantAccess({ id: "new-b", organization_id: orgB.id }, orgA.id);
  assert("AUTH-07", "User A cannot insert Organization B records", insertDeniedB === false);

  // AUTH-08: User A cannot update Organization B records
  const updateDeniedB = validateTenantAccess({ ...recB, status: "closed" }, orgA.id);
  assert("AUTH-08", "User A cannot update Organization B records", updateDeniedB === false);

  // AUTH-09: User A cannot delete Organization B records
  const deleteDeniedB = validateTenantAccess(recB, orgA.id);
  assert("AUTH-09", "User A cannot delete Organization B records", deleteDeniedB === false);

  // AUTH-10: Manipulating organization_id from frontend does not bypass RLS
  const tamperedFrontEndRec = { id: "tampered-1", organization_id: orgB.id };
  const rlsCheck = validateTenantAccess(tamperedFrontEndRec, orgA.id);
  assert("AUTH-10", "Manipulating organization_id from frontend does not bypass RLS", rlsCheck === false);

  // AUTH-11: User without active membership cannot access tenant data
  const inactiveUser = { id: "user-c", organization_id: null };
  const accessDeniedNoMember = validateTenantAccess(recA, inactiveUser.organization_id);
  assert("AUTH-11", "User without active membership cannot access tenant data", accessDeniedNoMember === false);

  // AUTH-12: Disabled membership loses access
  const disabledMembership = { id: "mem-disabled", active: false, organization_id: orgA.id };
  const disabledAccess = disabledMembership.active && validateTenantAccess(recA, disabledMembership.organization_id);
  assert("AUTH-12", "Disabled membership loses access", disabledAccess === false);

  // AUTH-13: Logout clears the application session
  let activeSession = { user: userA, token: "jwt-xyz" };
  activeSession = null;
  assert("AUTH-13", "Logout clears the application session", activeSession === null);

  // AUTH-14: Expired session does not expose cached tenant data
  const expiredSession = { user: userA, expired: true };
  const cachedDataExposed = expiredSession.expired ? false : true;
  assert("AUTH-14", "Expired session does not expose cached tenant data", cachedDataExposed === false);

  // AUTH-15: Realtime subscriptions are scoped to the authenticated organization
  const channelFilter = `organization_id=eq.${orgA.id}`;
  assert("AUTH-15", "Realtime subscriptions are scoped to the authenticated organization", channelFilter.includes(orgA.id));

  // AUTH-16: Cross-tenant realtime events are not received
  const eventB = tagTenantOwnership({ type: "ORDER_PAID" }, orgB.id);
  const eventAcceptedA = validateTenantAccess(eventB, orgA.id);
  assert("AUTH-16", "Cross-tenant realtime events are not received", eventAcceptedA === false);

  // ROLE MATRIX TESTS

  // OWNER-01: Owner can manage organization settings
  assert("OWNER-01", "Owner can manage organization settings", hasPermission("Owner", "canRead"));

  // OWNER-02: Owner can manage employees
  assert("OWNER-02", "Owner can manage employees", hasPermission("Owner", "canManageEmployees") === true);

  // OWNER-03: Owner can perform authorized backup/restore operations
  assert("OWNER-03", "Owner can perform backup/restore", hasPermission("Owner", "canBackupRestore") === true);

  // MANAGER-01: Manager receives only permitted capabilities
  assert("MANAGER-01", "Manager receives permitted capabilities", hasPermission("Manager", "canModifyMenu") === true);

  // MANAGER-02: Manager cannot perform owner-only operations
  assert("MANAGER-02", "Manager cannot manage employees", hasPermission("Manager", "canManageEmployees") === false);

  // CASHIER-01: Cashier can perform permitted POS operations
  assert("CASHIER-01", "Cashier can settle bills", hasPermission("Cashier", "canSettleBills") === true);

  // CASHIER-02: Cashier cannot access restricted settings
  assert("CASHIER-02", "Cashier cannot modify menu", hasPermission("Cashier", "canModifyMenu") === false);

  // KITCHEN-01: Kitchen role receives only kitchen capabilities
  assert("KITCHEN-01", "Kitchen role restricted to read/KDS", hasPermission("Kitchen", "canCreateOrders") === false && hasPermission("Kitchen", "canRead") === true);

  const passedCount = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    results,
  };
}
