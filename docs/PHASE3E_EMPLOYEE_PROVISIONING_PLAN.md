# Phase 3E: Owner-Managed Employee Provisioning Architecture & Plan

> **ARCHITECTURE & CONTROLLED STAGE SPECIFICATION**  
> Workspace: `C:\Users\Admin\Desktop\New folder\kado-cafe-pos-working-copy`  
> Target Project: `fnopmjtjezyovfugufwg`  
> Mode: **Stage 1 Implementation & Specification**

---

## 1. Approved System Architecture & Workflow

### The Invitation-Based Cloud Provisioning Flow
```
Owner (POS Terminal / Dashboard)
  → Employees Tab → Directory → "Add Employee"
  → Enters: Name, Email (optional), Role, Department, 4-Digit Terminal PIN
  → Submits form
  → Secure Edge Function (`manage-employee`) invoked with Owner Bearer JWT
      ├── 1. Validates Owner JWT & verifies caller role = 'Owner' in organization_members
      ├── 2. Extracts organization_id strictly from caller's database record (never client input)
      ├── 3. Validates email format & enforces PIN uniqueness within the organization
      ├── 4. If Email provided: Calls Supabase Auth `inviteUserByEmail` (generates password invite)
      ├── 5. Inserts membership into `organization_members` linked to new `user_id`
      └── 6. Rollback Safety: If DB insert fails, deletes the created Auth user to avoid orphans
  → Returns success to POS UI
  → POS UI syncs local `state.employees` and displays confirmation toast
  → Employee receives email invitation → Sets their permanent password
  → Employee can immediately log into POS via:
      ├── Option A: Cloud Account Login (Email + Chosen Password)
      └── Option B: Local Floor Terminal (Assigned PIN)
```

---

## 2. Comprehensive Security Invariants

1. **Zero Secret Leakage:** The `service_role` credential is never exposed in browser bundles or client requests. It remains strictly in server-side Edge Function secrets (`Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`).
2. **Server-Enforced Multi-Tenancy:** `organization_id` is never accepted from client payloads; it is resolved server-side from the authenticated Owner's record.
3. **Owner-Only Privilege Enforcement:** Only verified active `Owner` memberships can provision, edit, or deactivate accounts. Any non-Owner request returns `HTTP 403 Forbidden`.
4. **Historical Data Safety:** Account deactivation sets `active = false` and `status = 'disabled'`. It never deletes records from `cafe_state.orderHistory`, `pos_bills`, `pos_payments`, or audit logs.
5. **Instant Cloud Access Revocation:** When an employee is disabled, `organization_members.active` is set to `false`, causing subsequent `resolveOrganizationMembership()` calls to return `null` and block cloud sessions immediately.
6. **Local POS Fallback Protection:** Local terminal PIN login continues to work alongside cloud authentication during all phases.

---

## 3. Controlled 6-Stage Implementation Roadmap

| Stage | Milestone | Status | Key Deliverable |
|---|---|---|---|
| **STAGE 1** | Create Edge Function & Database Support | **IN PROGRESS** | `supabase/functions/manage-employee/index.ts` |
| **STAGE 2** | Test Edge Function Isolated Security Logic | **PENDING** | `scratch/test_stage1_edge_function.js` |
| **STAGE 3** | Connect Frontend UI (`EmployeeModal` / `EmployeesView`) | **PENDING** | UI invocation & local state sync |
| **STAGE 4** | Owner Provisioning End-to-End Verification | **PENDING** | Provision 1 employee via POS UI |
| **STAGE 5** | Employee Invitation & Role Boundary Verification | **PENDING** | Verify login & role permissions |
| **STAGE 6** | Deactivation & Data Preservation Verification | **PENDING** | Verify access blocked & history preserved |

---

## 4. Edge Function Contract (`manage-employee`)

- **Path:** `/functions/v1/manage-employee`
- **Method:** `POST`
- **Headers:** `Authorization: Bearer <Owner_JWT>`, `Content-Type: application/json`

### Action Payloads:

#### 1. `provision`
```json
{
  "action": "provision",
  "name": "Jane Doe",
  "email": "jane@kadocafe.com",
  "role": "Waiter",
  "department": "Service",
  "pin": "2345"
}
```
*Response:*
```json
{
  "success": true,
  "data": {
    "member_id": "UUID",
    "user_id": "UUID",
    "name": "Jane Doe",
    "role": "Waiter",
    "organization_id": "00000000-0000-0000-0000-000000000001",
    "active": true,
    "invite_sent": true
  }
}
```

#### 2. `update`
```json
{
  "action": "update",
  "member_id": "UUID",
  "name": "Jane Doe",
  "role": "Cashier",
  "department": "Operations",
  "pin": "2345"
}
```

#### 3. `toggle-status`
```json
{
  "action": "toggle-status",
  "member_id": "UUID"
}
```
