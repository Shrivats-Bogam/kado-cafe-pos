# Phase 4B: Server-Authoritative Payment & Refund Integration Plan

> **ARCHITECTURE DISCOVERY & INTEGRATION SPECIFICATION**  
> Workspace: `C:\Users\Admin\Desktop\New folder\kado-cafe-pos-working-copy`  
> Live Database: Supabase `fnopmjtjezyovfugufwg` (Phase 4A B4A Foundation Deployed & Active)  
> Status: **READ-ONLY DISCOVERY COMPLETE — PLANNING ONLY (No code modified)**

---

## 1. Current Architecture vs. Target Architecture

```
[CURRENT RUNTIME ARCHITECTURE]
UI (BillModal / CheckoutPanel)
  └──> actions.js (generateBillForTable / createBill)
         ├── Mutates state.orders in browser JS
         ├── Mutates state.payments in browser JS (unverified JSON object)
         ├── Mutates state.inventory in browser JS (deductStockForOrderItems)
         └── Writes full document to cafe_state via upsert_cafe_state()
               └── ⚠️ ZERO database ledger rows, ZERO server transaction locks.

[TARGET PHASE 4B ARCHITECTURE]
UI (BillModal / CheckoutPanel / BillingHistory)
  ├── 1. Generates unique collision-resistant idempotencyKey
  ├── 2. Calls serverTransactions.js -> record_server_payment() / record_server_refund()
  │      └── PostgreSQL B4A RPC (SECURITY DEFINER)
  │             ├── Verifies auth.uid() -> organization_members (Owner/Manager/Staff)
  │             ├── Checks pos_idempotency_keys (replays if duplicate)
  │             ├── Inserts immutable row into pos_financial_ledger
  │             ├── For refunds: validates cumulative amount <= original paid total
  │             └── Returns { success: true, payment_id, ledger_id, status: 'PAID' }
  └── 3. UI receives server confirmation -> syncs state.orders, state.inventory, and cafe_state.
```

---

## 2. Comprehensive Call Graph & Mutation Analysis

### A. Active Payment Call Graph
1. **Dine-In Table Order:**
   `TableOrderScreen.jsx` → `BillModal.jsx:onConfirm(paymentMode, phone, redeemedPoints)` → `StaffApp.jsx:generateBillForTable()` → `actions.js:generateBillForTable()` → `StaffApp` `useEffect` → `storage.js:setState()` → `upsert_cafe_state()`.
2. **Takeaway / Parcel Order:**
   `ParcelView.jsx` → `ParcelOrderScreen.jsx` → `CheckoutPanel.jsx:onCompleteCheckout(billData)` → `actions.js:createBill()` → `storage.js:setState()` → `upsert_cafe_state()`.
3. **Pending Bill Settlement:**
   `BillingHistory.jsx` → `actions.js:payPendingBill()` → `storage.js:setState()`.

### B. Active Refund Call Graph
* **Current Vulnerability:** `BillingHistory.jsx:235` calls `onUpdateBillStatus(bill.id, "Refunded")` which only mutates `order.status = "Refunded"` in `state.orderHistory`. It **bypasses amount validation, role permissions, and creates zero ledger records**.
* **Target Flow:** `BillingHistory.jsx` prompts for refund reason → invokes `executeServerRefund()` → calls `record_server_refund()` RPC in PostgreSQL → on server success, updates `state.refunds`, `state.payments`, and marks order `REFUNDED` via `actions.refundOrder()`.

### C. Active Inventory Deduction Call Graph
* `actions.js:deductStockForOrderItems()` evaluates recipe ingredients for every order item and decrements `state.inventory[item].currentStock`.
* Handled client-side upon confirmed payment and reconciled via `mergeStates()` during document sync.

### D. Mutation Boundary Separation
* **Client-Side UI State (Retained in Frontend):** Cart selection, draft order notes, kitchen ticket status (`New` → `Cooking` → `Ready` → `Served`), UI active tabs, temporary table priority.
* **Server-Authoritative State (Transitioning to PostgreSQL B4A):** Payment creation, payment settlement, split payment allocations, refund authorizations, over-refund limits, idempotency replay cache.

---

## 3. Failure, Concurrency & Idempotency Strategy

### H. Duplicate Clicks & Retries
- Every payment request generates `idem_pay_<orderId>_<timestamp>_<random>`.
- If a cashier double-clicks or the network retries, `record_server_payment` retrieves the cached result from `pos_idempotency_keys` and returns the existing transaction without creating duplicate ledger records.

### I. Concurrent Multi-Device Checkouts
- Each checkout receives a unique ledger entry in `pos_financial_ledger` indexed by `(organization_id, order_id)`.
- Multi-device table collisions are prevented by checking table status before billing.

### J. Offline & Network Failure Handling
- If offline, `serverTransactions.js` flags the transaction as `PENDING_SERVER_SYNC` with its idempotency key.
- Upon reconnection, the client retries the RPC. The server executes it once or replays the cached result safely.

### K. Split Payments Representation
- For split payments (e.g. ₹300 Cash + ₹200 UPI for a ₹500 bill), each split leg is recorded in `pos_financial_ledger` with `idempotency_key = idem_split_<orderId>_<method>` sharing the same `order_id`.
- The sum of split rows in the ledger equals the grand total.

### L. Refund Mapping to Original Payments
- `record_server_refund` sums all `type = 'PAYMENT'` rows for `order_id` in `pos_financial_ledger` and subtracts existing `pos_refunds`.
- Rejects any refund request where `refund_amount > remaining_refundable_balance` with `OVER_REFUND_REJECTED`.

---

## 4. Exact Files & Functions to Modify in Phase 4B

| Component | File Path | Specific Changes Required |
|---|---|---|
| **Server Client Library** | [`src/lib/serverTransactions.js`](file:///C:/Users/Admin/Desktop/New%20folder/kado-cafe-pos-working-copy/src/lib/serverTransactions.js) | Update `executeServerPayment` and `executeServerRefund` to call live B4A RPCs (`record_server_payment`, `record_server_refund`) with caller's Supabase JWT. |
| **Staff Application Coordinator** | [`src/components/StaffApp.jsx`](file:///C:/Users/Admin/Desktop/New%20folder/kado-cafe-pos-working-copy/src/components/StaffApp.jsx) | Wrap `generateBillForTable` and `onUpdateBillStatus` to execute server transaction prior to local state mutation. |
| **Billing History & Refund UI** | [`src/components/BillingHistory.jsx`](file:///C:/Users/Admin/Desktop/New%20folder/kado-cafe-pos-working-copy/src/components/BillingHistory.jsx) | Connect Refund button to trigger `executeServerRefund()` with refund reason modal and manager role check. |
| **Table Bill Modal** | [`src/components/BillModal.jsx`](file:///C:/Users/Admin/Desktop/New%20folder/kado-cafe-pos-working-copy/src/components/BillModal.jsx) | Add split amount inputs for Cash, UPI, and Card matching `CheckoutPanel.jsx`. |
| **State Actions** | [`src/state/actions.js`](file:///C:/Users/Admin/Desktop/New%20folder/kado-cafe-pos-working-copy/src/state/actions.js) | Accept server `ledger_id` and `payment_id` returned from RPC and record into `state.payments`. |

---

## 5. Controlled Implementation & Verification Roadmap

1. **STAGE 1: Client Library Upgrade (`serverTransactions.js`)**
   - Wire `executeServerPayment`, `executeServerSplitPayment`, and `executeServerRefund` to B4A RPCs.
   - Run unit tests in `scratch/test_server_transactions_client.js`.

2. **STAGE 2: Connect Table Billing & Parcel Checkout (`BillModal` / `StaffApp`)**
   - Connect `generateBillForTable` and `createBill` to execute server payment settlement.
   - Ensure local POS terminal state receives server `ledger_id`.

3. **STAGE 3: Connect Refund Workflow (`BillingHistory.jsx`)**
   - Add Refund Modal asking for reason and amount.
   - Connect to `executeServerRefund()` and `actions.refundOrder()`.

4. **STAGE 4: End-to-End Test in Isolated E2E Environment (`kado-cafe-e2e`)**
   - Execute full lifecycle: Order → Split Pay → Partial Refund → Full Refund → Duplicate Replay.
   - Verify ledger records in Supabase `pos_financial_ledger`.

---

## 6. Risk Assessment & Safety Invariants

* **Production Data Safety:** Production `kado-cafe` row in `cafe_state` remains untouched during development and testing.
* **Backward Compatibility:** Single-terminal and offline mode continue to operate with local session fallback if Supabase is temporarily unreachable.
* **Zero Secret Leakage:** No service-role keys are used; all RPCs execute via authenticated user JWT (`auth.uid()`).

---

> [!IMPORTANT]
> **READ-ONLY DISCOVERY COMPLETE:** Phase 4B integration plan is documented. Antigravity has stopped. Awaiting user review and approval before beginning Phase 4B code updates.
