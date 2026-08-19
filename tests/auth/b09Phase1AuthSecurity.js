import { readFileSync } from "node:fs";
import {
  authenticateLocalPin,
  buildCloudUserIdentity,
  loginWithEmail,
  resolveLocalUserIdentity,
  resolveOrganizationMembership,
} from "../../src/lib/auth.js";

const results = [];

function assert(name, condition) {
  results.push({ name, passed: Boolean(condition) });
  if (!condition) throw new Error(`FAILED: ${name}`);
}

async function rejects(name, fn) {
  try {
    await fn();
  } catch {
    assert(name, true);
    return;
  }
  assert(name, false);
}

console.log("=== PHASE 2 FOCUSED AUTHENTICATION TEST SUITE ===");

// --- Local Employees State ---
const employees = [
  { id: "emp_1", name: "Alex Morgan", role: "Owner", pin: "1234", status: "active" },
  { id: "emp_2", name: "Sarah Jenkins", role: "Manager", pin: "0000", status: "active" },
  { id: "emp_3", name: "David Kim", role: "Kitchen", pin: "5555", status: "active" },
  { id: "emp_4", name: "Emily Watson", role: "Waiter", pin: "1111", status: "active" },
  { id: "emp_disabled", name: "Disabled User", role: "Manager", pin: "3333", status: "disabled" },
  { id: "emp_inactive", name: "Inactive User", role: "Staff", pin: "4444", status: "Inactive" },
];

// --- J. Local PIN Owner Login ---
const owner = authenticateLocalPin(employees[0], "1234");
assert("J. Existing local PIN Owner login works", owner.id === "emp_1" && owner.role === "Owner");

// --- K. Local PIN Manager Login ---
const manager = authenticateLocalPin(employees[1], "0000");
assert("K. Existing local PIN Manager login works", manager.id === "emp_2" && manager.role === "Manager");

// --- L. Local PIN Staff Login ---
const staff = authenticateLocalPin(employees[3], "1111");
assert("L. Existing local PIN Staff login works", staff.id === "emp_4" && staff.role === "Waiter");

// --- M. Local PIN Kitchen Login ---
const kitchen = authenticateLocalPin(employees[2], "5555");
assert("M. Existing local PIN Kitchen login works", kitchen.id === "emp_3" && kitchen.role === "Kitchen");

// --- Disabled Employee Local PIN ---
await rejects("Disabled employee status=disabled PIN rejected", () => Promise.resolve(authenticateLocalPin(employees[4], "3333")));
await rejects("Disabled employee status=Inactive PIN rejected", () => Promise.resolve(authenticateLocalPin(employees[5], "4444")));

// --- Helper Mock Supabase Generator ---
function createMockSupabase({ authError = null, user = null, membershipData = null } = {}) {
  return {
    auth: {
      signInWithPassword: async ({ email, password }) => {
        if (authError) return { data: {}, error: authError };
        return { data: { user: user || { id: "user-uuid-1", email } }, error: null };
      },
    },
    from: (table) => {
      if (table === "organization_members") {
        return {
          select: () => ({
            eq: () => ({
              eq: (field, val) => ({
                maybeSingle: async () => {
                  if (!membershipData) return { data: null, error: null };
                  if (field === "active" && val === true && membershipData.active === false) {
                    return { data: null, error: null };
                  }
                  return { data: membershipData, error: null };
                },
              }),
            }),
          }),
        };
      }
      return {};
    },
  };
}

// --- A. Invalid Cloud Credentials → Rejected ---
await rejects(
  "A. Invalid cloud credentials rejected",
  () => loginWithEmail(createMockSupabase({ authError: new Error("Invalid login credentials") }), "user@example.com", "wrongpass")
);

// --- B. Successful Supabase Authentication → Identity Obtained ---
const mockAuthSuccessClient = createMockSupabase({
  user: { id: "user-b", email: "b@example.com" },
  membershipData: { id: "mem-b", organization_id: "org-b", user_id: "user-b", name: "User B", role: "Staff", active: true }
});
const sessionB = await loginWithEmail(mockAuthSuccessClient, "b@example.com", "validpass");
assert("B. Successful Supabase authentication obtains user identity", sessionB.user.id === "user-b" && sessionB.user.email === "b@example.com");

// --- C. Authenticated User Without Organization Membership → Rejected ---
await rejects(
  "C. Authenticated user without valid organization membership rejected",
  () => loginWithEmail(createMockSupabase({ user: { id: "user-no-membership" }, membershipData: null }), "nomem@example.com", "validpass")
);

// --- D. Authenticated User With Valid Membership → Role Resolved ---
const sessionD = await loginWithEmail(createMockSupabase({
  user: { id: "user-d" },
  membershipData: { id: "mem-d", organization_id: "org-d", user_id: "user-d", name: "User D", role: "Manager", active: true }
}), "d@example.com", "validpass");
assert("D. Role resolved from organization membership", sessionD.role === "Manager" && sessionD.organization_id === "org-d");

// --- E. Owner Membership → Owner Session ONLY when membership explicitly specifies Owner ---
const sessionOwner = await loginWithEmail(createMockSupabase({
  user: { id: "user-owner" },
  membershipData: { id: "mem-owner", organization_id: "org-1", user_id: "user-owner", name: "Cloud Owner", role: "Owner", active: true }
}), "owner@example.com", "validpass");
assert("E. Owner session created when membership explicitly says Owner", sessionOwner.role === "Owner");

const sessionNonOwner = await loginWithEmail(createMockSupabase({
  user: { id: "user-staff" },
  membershipData: { id: "mem-staff", organization_id: "org-1", user_id: "user-staff", name: "Cloud Staff", role: "Staff", active: true }
}), "staff@example.com", "validpass");
assert("E. Non-Owner membership NEVER grants Owner role", sessionNonOwner.role === "Staff" && sessionNonOwner.role !== "Owner");

// --- F. Manager Membership → Manager Session ---
const sessionF = await loginWithEmail(createMockSupabase({
  user: { id: "user-mgr" },
  membershipData: { id: "mem-mgr", organization_id: "org-1", user_id: "user-mgr", name: "Cloud Mgr", role: "Manager", active: true }
}), "mgr@example.com", "validpass");
assert("F. Manager membership grants Manager session", sessionF.role === "Manager");

// --- G. Staff Membership → Staff Session ---
const sessionG = await loginWithEmail(createMockSupabase({
  user: { id: "user-staff-2" },
  membershipData: { id: "mem-staff-2", organization_id: "org-1", user_id: "user-staff-2", name: "Cloud Staff 2", role: "Staff", active: true }
}), "staff2@example.com", "validpass");
assert("G. Staff membership grants Staff session", sessionG.role === "Staff");

// --- H. Kitchen Membership → Kitchen Session ---
const sessionH = await loginWithEmail(createMockSupabase({
  user: { id: "user-kitchen" },
  membershipData: { id: "mem-kt", organization_id: "org-1", user_id: "user-kitchen", name: "Cloud Kitchen", role: "Kitchen", active: true }
}), "kitchen@example.com", "validpass");
assert("H. Kitchen membership grants Kitchen session", sessionH.role === "Kitchen");

// --- I. Disabled / Inactive Membership → Rejected ---
await rejects(
  "I. Disabled/inactive membership rejected",
  () => loginWithEmail(createMockSupabase({
    user: { id: "user-disabled" },
    membershipData: { id: "mem-disabled", organization_id: "org-1", user_id: "user-disabled", name: "Disabled Cloud", role: "Manager", active: false }
  }), "disabled@example.com", "validpass")
);

// --- LoginScreen Source Security Guard ---
const loginScreenSource = readFileSync(new URL("../../src/components/LoginScreen.jsx", import.meta.url), "utf8");
assert(
  "LoginScreen has no unauthenticated Owner fallback",
  !loginScreenSource.includes('id: "user-cloud"') &&
  !loginScreenSource.includes("Fallback simulated cloud login")
);

console.log(`\nPhase 2 Auth Security: ${results.length}/${results.length} tests passed cleanly!`);
