# Phase 4A: Server-Authoritative Financial Foundation Architecture & Plan

> **STATUS: PLANNING & SECURITY REVIEW ONLY (STOPPED BEFORE LIVE DEPLOYMENT)**  
> Workspace: `C:\Users\Admin\Desktop\New folder\kado-cafe-pos-working-copy`  
> Prepared Migration: [`supabase/b4a_financial_foundation.sql`](file:///C:/Users/Admin/Desktop/New%20folder/kado-cafe-pos-working-copy/supabase/b4a_financial_foundation.sql)  
> Target Project: `fnopmjtjezyovfugufwg`  
> Mode: **Read-Only / Pre-Deployment Verification (Zero live SQL executed)**

---

## 1. Full SQL Security Review: 20-Point Technical Assessment

| # | Question | Finding & Architectural Analysis | Status |
|---|---|---|---|
| 1 | **Tables created/altered** | Creates `pos_financial_ledger`, `pos_refunds`, `pos_idempotency_keys`. Alters zero existing tables. | **VERIFIED** |
| 2 | **Functions / RPCs created** | Creates `record_server_payment()`, `record_server_refund()`, `get_auth_organization_id()`. | **VERIFIED** |
| 3 | **Triggers / Indexes / Policies** | 4 B-Tree indexes created. RLS enabled on all 3 tables (`SELECT` scoped to tenant, `UPDATE`/`DELETE` blocked). | **VERIFIED** |
| 4 | **DML operations performed** | Inserts ledger, refund, and idempotency cache rows. Zero `DELETE` or destructive `UPDATE` statements. | **VERIFIED** |
| 5 | **Impact on `cafe_state`** | **ZERO.** Script does not touch, reference, alter, or drop `cafe_state`. | **SAFE** |
| 6 | **Un-deployed table dependencies** | **FIXED.** Legacy B10 assumed `pos_orders` and `pos_payments` existed. `b4a_financial_foundation.sql` is 100% self-contained and supports both document and relational order IDs. | **SAFE** |
| 7 | **Organization model match** | Matches live schema: foreign keys reference `organizations(id)` and validates via `organization_members`. | **VERIFIED** |
| 8 | **RLS authentication model** | Strictly uses `auth.uid()` joining onto `organization_members.user_id` where `active = true`. | **VERIFIED** |
| 9 | **Anon unauthenticated access** | **BLOCKED.** RPCs explicitly verify `IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'`. | **ENFORCED** |
| 10 | **Role forgery prevention** | **BLOCKED.** Caller role is queried from `organization_members` server-side; client role parameter is ignored. | **ENFORCED** |
| 11 | **Organization ID tampering** | **BLOCKED.** `organization_id` is derived from caller's database membership row; client cannot pass arbitrary org IDs. | **ENFORCED** |
| 12 | **Amount manipulation** | Enforces `amount > 0` and validates refund amounts against recorded payment totals in PostgreSQL. | **ENFORCED** |
| 13 | **Idempotency uniqueness** | Enforced by `idempotency_key TEXT UNIQUE` and `pos_idempotency_keys PRIMARY KEY`. | **ENFORCED** |
| 14 | **Idempotent replay behavior** | Duplicate calls with identical idempotency key return cached `result_json` with zero new database rows created. | **VERIFIED** |
| 15 | **Over-refund protection** | PostgreSQL computes `SUM(amount)` of payments minus previous refunds and rejects amounts exceeding the balance. | **ENFORCED** |
| 16 | **Append-only ledger** | Tables are strictly append-only. No UPDATE or DELETE policies are granted to clients. | **ENFORCED** |
| 17 | **Client UPDATE/DELETE blocked** | Direct client UPDATE and DELETE operations are denied by RLS policy omission. | **ENFORCED** |
| 18 | **Numeric monetary precision** | All monetary values strictly use `NUMERIC(10, 2)` (zero IEEE floating-point rounding errors). | **VERIFIED** |
| 19 | **Idempotent migration execution** | Safe to run repeatedly (`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`). | **SAFE** |
| 20 | **Rollback & recovery** | Clean DDL transactional execution; rollback script documented. | **VERIFIED** |

---

## 2. Structural Comparison: Legacy B10 vs. Corrected B4A

```
[LEGACY B10 VULNERABILITIES]              [CORRECTED B4A FOUNDATION]
❌ Trusted p_organization_id from browser   ✅ Server-derives org_id from auth.uid()
❌ Trusted p_staff_role from client body    ✅ Server-resolves role from organization_members
❌ Depended on missing pos_orders table    ✅ Self-contained ledger for any orderId
❌ Unauthenticated calls possible in RPC    ✅ auth.uid() check rejects anon callers
❌ Relied on missing auth.current_org_id()  ✅ Uses get_auth_organization_id() helper
❌ Permitted FOR ALL on RLS policies        ✅ Strict SELECT-only with UPDATE/DELETE blocked
```

---

## 3. Detailed Component Plan (Sections A through H)

### A. Existing B10 SQL Problems
1. **Missing Table Dependencies:** Legacy B10 functions executed `SELECT * FROM pos_orders FOR UPDATE` and `INSERT INTO pos_payments`. Since neither table exists in production Supabase, executing B10 caused runtime database crashes (`relation "pos_orders" does not exist`).
2. **Client Parameter Forgery:** B10 accepted `p_staff_role` and `p_organization_id` as input arguments, allowing malicious callers to forge Owner privileges or tamper with other organizations.
3. **Broken RLS Functions:** B10 policies referenced `auth.current_organization_id()`, a non-existent Supabase function.

### B. Proposed Corrected Architecture
- **Self-Contained Immutable Ledger:** `pos_financial_ledger` records every payment and refund with tenant isolation.
- **Server-Authoritative Identity:** Both `record_server_payment` and `record_server_refund` query `organization_members` for `auth.uid()`, enforcing active membership and role permissions (`Owner`/`Manager` for refunds).
- **PostgreSQL Over-Refund Guard:** Database validates that cumulative refunds never exceed original paid amounts.

### C. Exact SQL File Prepared
* **File:** [`supabase/b4a_financial_foundation.sql`](file:///C:/Users/Admin/Desktop/New%20folder/kado-cafe-pos-working-copy/supabase/b4a_financial_foundation.sql) (100% prepared, zero live execution).

### D. Tables, Functions, and Policies to be Created
* **Tables:** `pos_financial_ledger`, `pos_refunds`, `pos_idempotency_keys`
* **RPC Functions:** `record_server_payment(p_order_id, p_amount, p_payment_method, p_idempotency_key)`, `record_server_refund(p_order_id, p_refund_amount, p_reason, p_idempotency_key)`
* **RLS Policies:** `pos_financial_ledger_select`, `pos_refunds_select`, `pos_idempotency_keys_select`

### E. Why Existing `cafe_state` is Unaffected
* The migration introduces independent relational financial tables.
* It does NOT modify, rename, drop, or alter `cafe_state` or `upsert_cafe_state`.
* Local storage and realtime `cafe_state` continue running with zero downtime.

### F. Rollback Strategy
If deployment needs to be rolled back, the following SQL safely removes the foundation without touching any other tables:
```sql
DROP FUNCTION IF EXISTS record_server_payment;
DROP FUNCTION IF EXISTS record_server_refund;
DROP FUNCTION IF EXISTS get_auth_organization_id;
DROP TABLE IF EXISTS pos_idempotency_keys CASCADE;
DROP TABLE IF EXISTS pos_refunds CASCADE;
DROP TABLE IF EXISTS pos_financial_ledger CASCADE;
```

### G. Static & Isolated Test Results
Executed `scratch/test_stage4a_financial_security.js` with **11/11 Gates Passed**:
1. Normal Payment Settlement: **PASS**
2. Idempotent Replay (Zero duplicate rows): **PASS**
3. Unauthenticated Call Rejection: **PASS**
4. Inactive Employee Rejection: **PASS**
5. Server-Enforced Tenant Isolation: **PASS**
6. Non-Manager Refund Rejection: **PASS**
7. Valid Partial Refund: **PASS**
8. Over-Refund Limit Protection: **PASS**
9. Duplicate Refund Idempotency Replay: **PASS**
10. Input & Parameter Sanitization: **PASS**
11. Direct UPDATE/DELETE Blocking on Ledger: **PASS**

### H. Remaining Risks & Post-Deployment Requirements
* After deployment of `b4a_financial_foundation.sql`, the POS UI (`StaffApp.jsx` & `BillingHistory.jsx`) will need to be wired to call `record_server_payment` and `record_server_refund` during checkout and refund flows (Phase 4B).

---

> [!CRITICAL]
> **DEPLOYMENT HALTED:** Antigravity has stopped before live database deployment. Awaiting your review and explicit approval of `supabase/b4a_financial_foundation.sql`.
