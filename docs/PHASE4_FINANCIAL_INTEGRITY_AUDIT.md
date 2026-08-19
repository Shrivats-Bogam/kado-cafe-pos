# Phase 4: Production Financial Integrity Audit Report

> **READ-ONLY AUDIT & ARCHITECTURAL REALITY CHECK**  
> Workspace: `C:\Users\Admin\Desktop\New folder\kado-cafe-pos-working-copy`  
> Target Supabase Project: `fnopmjtjezyovfugufwg`  
> Date: 2026-08-19  
> Mode: **Read-Only Inspection (No data modified, no migrations executed)**

---

## 1. Executive Summary & Classification Matrix

This audit traces the actual runtime execution path of all financial, order, billing, payment, refund, and inventory operations in the active Kado Cafe POS application.

| # | Audit Item | Status | Architectural Reality |
|---|---|---|---|
| **A** | **`serverTransactions.js` In Use** | **FAIL** | Code exists in repo (`src/lib/serverTransactions.js`), but is **NEVER imported or called** anywhere in active application code (`src/views/*`, `src/components/*`, `src/state/*`, `src/lib/storage.js`). It is imported only in `tests/e2e/*`. |
| **B** | **`b10_server_transactions.sql` Deployed** | **FAIL** | SQL script exists locally, but live database probe confirmed `pos_financial_ledger`, `pos_refunds`, `pos_idempotency_keys`, `settle_payment_transaction` RPC, and `process_refund_transaction` RPC **DO NOT EXIST** in the live Supabase project (`PGRST205` / not found). |
| **C** | **Database-Level Atomicity** | **FAIL** | Payments, inventory deductions, and order completions occur as client-side JavaScript object mutations, subsequently written as a single monolithic JSON blob to `cafe_state`. Zero ACID database transaction protection. |
| **D** | **Server-Side Idempotency** | **FAIL** | No idempotency keys are validated or stored server-side. |
| **E** | **Concurrent Duplicate Payment Risk** | **FAIL** | While single-client table status checks exist (`targetTable.status === 'available'`), there are no PostgreSQL row-level locks or transactional guards against concurrent multi-device checkouts. |
| **F** | **Concurrent Inventory Double-Deduction Risk** | **FAIL** | Inventory is deducted in browser memory and reconciled via optimistic JSON merging (`storage.js:mergeStates`), leading to potential stock drift under concurrent order bursts. |
| **G** | **Refund Over-Payment Prevention** | **FAIL** | Safe logic exists in `actions.js:refundOrder`, but the active UI (`BillingHistory.jsx:235`) calls `updateBillStatus(bill.id, "Refunded")`, which **completely bypasses validation and over-refund limits**. |
| **H** | **Split Payment Reconciliation** | **PASS (Partial)** | `CheckoutPanel.jsx` strictly validates `splitSum === grandTotal`. However, `BillModal.jsx` lacks split breakdown input controls. |
| **I** | **Partial State on Failure** | **FAIL** | A network failure between local state mutation and `upsert_cafe_state` leaves the client with a recorded payment that does not exist in the cloud database. |
| **J** | **Client-Side Financial Mutability** | **FAIL** | `cafe_state` RLS is currently **DISABLED** in production Supabase. Any client with the anon API key can write arbitrary financial, order, or revenue values directly into `cafe_state`. |

---

## 2. Tracing the 10 POS Financial Runtime Domains

### 1. Order Creation
* **Runtime Path:** `TableOrderScreen.jsx` → `onSave()` → `StaffApp.jsx:308` → `actions.saveTableOrder()` → `StaffApp` `useEffect` → `storage.js:setState()` → `upsert_cafe_state(p_data)`.
* **Finding:** Executed purely in client memory. No server validation of item availability, prices, or taxes.

### 2. Bill Generation
* **Runtime Path:** `TableOrderScreen.jsx` → `BillModal.jsx` → `onConfirm()` → `StaffApp.jsx:311` → `actions.generateBillForTable()`.
* **Finding:** Generates client ID `makeId("o")`. Computes subtotals, GST, and discounts in browser JavaScript. Appends to `state.orders` and `state.orderHistory`.

### 3. Payment Processing
* **Runtime Path:** Embedded directly within `actions.js:generateBillForTable` (lines 132–140) or `actions.js:payPendingBill` (lines 783–804).
* **Finding:** Creates an unverified JavaScript object `{ id: "pay_" + billId, amount, mode, status: "completed" }` saved into `state.payments`. No server payment ledger or payment gateway integration.

### 4. Split Payment
* **Runtime Path:** `CheckoutPanel.jsx` (Parcel / Takeaway) validates `Math.abs(splitDiff) < 0.01` and records `paymentBreakdown: [{ method, amount }]`.
* **Finding:** In `BillModal.jsx` (Dine-in Tables), selecting "Split" sends `paymentMode = "Split"` without recording split item amounts.

### 5. Refunds
* **Runtime Path:** `BillingHistory.jsx:235` → `onUpdateBillStatus(bill.id, "Refunded")` → `actions.js:updateBillStatus()`.
* **Finding:** Sets `order.status = "Refunded"`. Does NOT create a negative ledger record in `state.payments`, does NOT invoke `actions.refundOrder()`, and does NOT restock inventory.

### 6. Inventory Deduction
* **Runtime Path:** `actions.js:deductStockForOrderItems()`.
* **Finding:** Synchronously decrements `state.inventory` stock based on `state.recipes` inside the browser when a bill is marked "Paid". Zero database foreign key or trigger validation.

### 7. Duplicate Payment Prevention
* **Runtime Path:** `actions.js:94-98` checks `if (targetTable.status === "available") return state;`.
* **Finding:** Relies on in-memory table status. If two devices tap "Pay" within the same network round-trip window, both generate separate bills for the same table.

### 8. Duplicate Inventory Deduction Prevention
* **Runtime Path:** Handled during write merge in `storage.js:mergeStates()`.
* **Finding:** Deductions are merged by item ID, but concurrent deductions from separate devices for the same ingredient can overwrite each other, causing stock count discrepancies.

### 9. Concurrent Multi-Device Checkout
* **Runtime Path:** `storage.js:setState()` → `mergeStates()`.
* **Finding:** If Device A and Device B checkout simultaneously, `mergeStates()` combines `orders` and `payments` arrays. While this prevents order loss, it does not guarantee atomic balance reconciliation.

### 10. Financial Reporting & Reconciliation
* **Runtime Path:** `ReportsView.jsx` & `reportsAggregate.js`.
* **Finding:** Aggregates `state.orderHistory` in browser memory on-the-fly. If `cafe_state` is altered or lost, all historical revenue analytics change immediately.

---

## 3. Current Financial System of Record

> **The actual, active production System of Record is a single JSON document store:**  
> **Table:** `public.cafe_state`  
> **Target Row:** `cafe_id = 'kado-cafe'`  
> **Column:** `data` (JSONB containing `orders`, `payments`, `orderHistory`, `inventory`, `inventoryLogs`, `tables`)  
> **Write Function:** `public.upsert_cafe_state(p_cafe_id, p_data)`  
> **RLS Status:** **DISABLED**

---

## 4. Critical Risks

1. **Unprotected Financial Record Writes (CRITICAL):** Because `cafe_state` RLS is disabled and payments are inside the client JSON blob, anyone with the public anon key can alter revenue history, clear payments, or fabricate orders via direct REST API calls.
2. **Broken Refund Ledger (HIGH):** The UI refund button does not record financial refund transactions in `state.payments` or `state.refunds`, causing discrepancy between gross revenue and net cash drawer balances.
3. **Ghost Inventory Under Concurrency (MEDIUM):** Multi-device simultaneous checkouts can drop recipe ingredient deductions during client-side JSON merges.
4. **Disconnected Server Engine (ARCHITECTURAL GAP):** A complete server transaction architecture (`b10_server_transactions.sql` & `serverTransactions.js`) was written and tested in E2E suites, but was **never wired to the active POS UI**.

---

## 5. Exact File & Function Locations

| Subsystem / Function | File Location | Line Numbers | Current Status |
|---|---|---|---|
| **Active Table Billing & Payment** | [`src/state/actions.js`](file:///C:/Users/Admin/Desktop/New%20folder/kado-cafe-pos-working-copy/src/state/actions.js) | L93–L162 (`generateBillForTable`) | Active (Client-side JSON) |
| **Active Pending Bill Settlement** | [`src/state/actions.js`](file:///C:/Users/Admin/Desktop/New%20folder/kado-cafe-pos-working-copy/src/state/actions.js) | L783–L804 (`payPendingBill`) | Active (Client-side JSON) |
| **Active Refund UI Trigger** | [`src/components/BillingHistory.jsx`](file:///C:/Users/Admin/Desktop/New%20folder/kado-cafe-pos-working-copy/src/components/BillingHistory.jsx) | L235–L242 | Active (Bypasses refund validation) |
| **Safe Refund Action (Unwired)** | [`src/state/actions.js`](file:///C:/Users/Admin/Desktop/New%20folder/kado-cafe-pos-working-copy/src/state/actions.js) | L1259–L1315 (`refundOrder`) | Defined, but not called by UI |
| **Server Transaction Client Library** | [`src/lib/serverTransactions.js`](file:///C:/Users/Admin/Desktop/New%20folder/kado-cafe-pos-working-copy/src/lib/serverTransactions.js) | L1–L215 | Unwired (Used only in E2E tests) |
| **Server Transaction SQL Migrations** | [`supabase/b10_server_transactions.sql`](file:///C:/Users/Admin/Desktop/New%20folder/kado-cafe-pos-working-copy/supabase/b10_server_transactions.sql) | L1–L409 | Not Deployed to Supabase |
| **Active Cloud Persistence** | [`src/lib/storage.js`](file:///C:/Users/Admin/Desktop/New%20folder/kado-cafe-pos-working-copy/src/lib/storage.js) | L250–L323 (`setState`) | Active (`cafe_state` document sync) |

---

## 6. Minimum Safe Remediation

1. **Step 1 — Connect UI to `refundOrder`:**
   Update `BillingHistory.jsx` so the Refund button prompts for refund reason and invokes `actions.refundOrder()`, ensuring proper role checks, over-refund prevention, and ledger recording.
2. **Step 2 — Table Modal Split Payment Controls:**
   Update `BillModal.jsx` to include split cash/UPI/card input fields matching `CheckoutPanel.jsx`.
3. **Step 3 — Deploy Relational Transaction Foundation:**
   Deploy `b10_server_transactions.sql` to Supabase (creates `pos_financial_ledger`, `pos_refunds`, `pos_idempotency_keys` with RLS).
4. **Step 4 — Dual-Write Payment Settlement:**
   Connect `StaffApp.jsx` to call `executeServerPayment()` and `executeServerRefund()` via `serverTransactions.js` alongside `cafe_state` sync.
5. **Step 5 — Enable RLS on Financial Tables:**
   Enforce tenant isolation on all financial ledger tables via authenticated JWT policies.

---

## 7. What Can Be Deployed Now vs. What Must Be Fixed Before Real Customer Payments

### What Can Be Deployed Now (Zero-Risk):
* Frontend fix connecting `BillingHistory.jsx` to `actions.refundOrder()` to prevent over-refunds and record audit logs in `state.refunds`.
* Frontend addition of split amount inputs in `BillModal.jsx`.

### What MUST Be Fixed Before Accepting Real Customer Payments:
1. **Deploy `pos_financial_ledger` and `pos_refunds` schema** in Supabase so financial records are stored as immutable append-only database rows.
2. **Wire `serverTransactions.js` into `StaffApp.jsx`** so every completed sale creates an immutable server ledger record with an idempotency key.
3. **Lock down `cafe_state` RLS** or transition payments strictly to server-authoritative RPC endpoints to prevent client-side revenue tampering.

---

> [!IMPORTANT]
> **Audit Complete:** Antigravity has performed a read-only audit. No production data was modified, no database migrations were run, and no application code was altered. Awaiting your review.
