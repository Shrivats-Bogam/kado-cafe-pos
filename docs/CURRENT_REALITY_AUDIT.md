# Kado Cafe POS - Current Reality Audit

**Audit date:** 2026-08-17  
**Scope:** Exact extracted working copy at `C:\Users\Admin\Desktop\New folder\kado-cafe-pos-working-copy`. Source inspection only. No migrations, Supabase connections, E2E runs, dependency installation, or production-data activity was performed.

**Evidence standard:** A source file, SQL script, scratch script, or prior sprint report proves only that it exists in this working copy. Runtime behavior, deployment state, database policies, and test outcomes are marked **UNVERIFIED** unless directly established by the current execution path.

## 1. Repository Identity

- Remote: `https://github.com/Shrivats-Bogam/kado-cafe-pos.git`
- Branch: `bugfix-stabilization-v1`
- HEAD: `75445c5` — `Bugfix 1.0: POS Reliability & UX Stabilization`
- Package: `kado-cafe@1.0.0` (`package.json`)
- The current archive-derived working tree contains implementation beyond HEAD. This audit assesses the files on disk, not only the HEAD commit.

## 2. Working Tree Changes

- `git status --short` shows 31 modified tracked files and substantial untracked content, including `.github/`, `tests/`, `scratch/`, advanced Supabase SQL, operational modules, and prior audit documents.
- `git diff --stat` for tracked changes: 31 files, 1,399 insertions, 250 deletions. Material changed paths include `src/lib/storage.js`, `auth.js`, `multitenant.js`, `backupEngine.js`, `src/state/actions.js`, `StaffApp.jsx`, and billing/inventory UI files.
- Therefore neither the current source nor the historical documents should be attributed solely to commit `75445c5`. The ZIP state is the implementation under audit and is intentionally preserved.

## 3. Architecture

**Actual implementation:** React/Vite browser application. `src/components/StaffApp.jsx` holds the hydrated application state and renders UI modules. Pure-ish reducers in `src/state/actions.js` return replacement state objects. `src/lib/storage.js` persists one large JSON document.

**Source of truth / persistence:** At runtime, the browser React state is authoritative after load; persistence is `localStorage` and, when configured, `public.cafe_state.data` through Supabase (`getState` / `setState`). The advanced normalized schema is present in `supabase/multitenant_schema.sql`, but the active storage path does not read or write its normalized tables.

**Enforcement:** Browser-only except for SQL that may be deployed. `src/lib/serverTransactions.js` and `supabase/b10_server_transactions.sql` exist, but no active call from `StaffApp` or `storage.js` to the server transaction RPCs was found.

**Risks / errors:** State serialization is per browser process. `serializeWrites` logs then swallows rejected writes (`storage.js:88-94`). Data and business rules are duplicated across UI, reducers, storage merge logic, and unused/uncalled SQL. Deployment of any schema is **UNVERIFIED**.

## 4. Authentication

**Actual implementation:**

- Terminal login in `src/components/LoginScreen.jsx:15-30` compares a four-digit PIN against the selected browser-supplied user record.
- `StaffApp.jsx:214-268` derives login cards from `state.employees` and legacy `state.users`, filters disabled records, then reconstructs a logged-in user from the employee record when found.
- `src/lib/auth.js` implements `loginWithEmail` using `supabaseClient.auth.signInWithPassword` and resolves `organization_members`; however, `StaffApp.jsx:68` calls `initializeAuthSession()` **without** a Supabase client and `LoginScreen` is not passed `onCloudLogin` (`StaffApp.jsx:244`). The Cloud Login UI consequently falls back to `onLogin({ role: "Owner", pin: "0000" })` at `LoginScreen.jsx:43-46`.
- In the same no-client path, `initializeAuthSession` creates a local fallback Owner session (`auth.js:54-64`), but `StaffApp` continues to use the separate local `loadSession` mechanism as its actual rendered session.

**Source of truth / persistence:** Employee/users arrays in the state blob; PIN and current staff session are plaintext browser localStorage (`src/lib/session.js`). `auth.js` also stores a JSON auth cache, but is not wired as the staff UI session authority.

**Enforcement:** Disabled employee filtering and re-checking is client-side (`StaffApp.jsx:170-195`, `LoginScreen.jsx:110`). Supabase Auth enforcement is **not active in the shown StaffApp flow**.

**Risks / errors:** PINs and user/session data are browser-readable and modifiable. The Cloud Login fallback provides Owner role without authenticating. A caller can manipulate browser state or invoke `window.__kadoUpdate` / `window.__kadoActions`, exposed at `StaffApp.jsx:209-212`. A server-issued identity, token validation, and deployment of active membership enforcement are **UNVERIFIED**.

## 5. RBAC

**Actual implementation:** `ROLE_TABS` controls visible tabs; `multitenant.js:118-169` provides a static permission matrix; `RolePermissions` writes editable `state.rolePermissions`; `refundOrder` checks an input `staffRole` against Owner/Manager (`actions.js:1259-1262`).

**Source of truth / persistence:** Employee roles and editable permissions are fields in the state blob. `StaffApp` uses static `ROLE_TABS`, not the editable permission matrix, to render navigation.

**Enforcement:** UI filtering and selected reducer checks are client-side. There is no common action authorization gate; table, menu, inventory, backup, and employee reducers accept direct calls. Normalized SQL/RLS would only apply if deployed and used, which is **UNVERIFIED**.

**Risks:** Permission updates do not become server-authoritative. Direct browser calls can bypass hidden UI. Role synchronization notices updates from the loaded state, but concurrent state merges can retain an older role via special-case merge heuristics (`storage.js:165-192`).

## 6. Multi-Tenancy

**Actual implementation:** `src/lib/multitenant.js` tracks a module-global organization ID, tags top-level state with `organization_id`, and provides client-side record filtering. `supabase/multitenant_schema.sql` defines `organizations`, `organization_members`, tenant-scoped POS tables, `auth.current_organization_id()`, and RLS policies. Additional SaaS procedures are in `supabase/b11_multitenant_saas.sql`.

**Source of truth / persistence:** The active storage API is still fixed by `CAFE_ID` (`storage.js:32`) and reads/writes `cafe_state`. It tags the document with the current organization (`storage.js:73-77`) but does not include organization ID in its `cafe_state` select or RPC parameters.

**Server enforcement:** The normalized SQL intends RLS (`multitenant_schema.sql:266-315`); the legacy `supabase/schema.sql:20` explicitly disables RLS on `cafe_state`. The runtime accesses that legacy state table, not the normalized tenant tables. Whether the secure schema supersedes the legacy schema in the deployed database is **UNVERIFIED**.

**Risks:** `auth.current_organization_id()` contains a default organization fallback. `validateTenantAccess` allows records with no `organization_id` for compatibility (`multitenant.js:95-100`). Both are unsafe as complete isolation guarantees without deployed, correctly used RLS.

## 7. Persistence

**Actual implementation:** `StaffApp` hydrates by `getState()` and saves every loaded React-state change using `setState(JSON.stringify(state))` (`StaffApp.jsx:64-103`). `storage.js` writes localStorage first, then optionally reads/cloud-upserts `cafe_state` via RPC or direct upsert (`storage.js:253-322`).

**Source of truth / persistence location:** Whole JSON document in `kado-cafe-state` (or environment-derived E2E key) and optionally `cafe_state.data`. No active normalized persistence path is wired from the staff application.

**Server enforcement:** None in the browser path beyond whatever permissions the deployed `cafe_state` table has. The supplied legacy schema disables RLS. **UNVERIFIED** on the live project.

**Risks / errors:** Errors are logged/swallowed. The fallback direct upsert bypasses the intended RPC when that RPC errors. State is saved before network acknowledgement. Corrupt/invalid JSON can throw at `JSON.parse` in `setState`; caller UI does not present an explicit persistence failure state.

## 8. Realtime / Concurrency

**Actual implementation:** `subscribeToChanges` listens to `cafe_state` changes; `StaffApp` replaces the in-memory state with the remote JSON and has a 90-second polling fallback (`StaffApp.jsx:105-168`). `mergeStates` merges selected entity collections by ID before a cloud write only when remote `state_version` is greater (`storage.js:129-247`, `293-304`). E2E mode selects `kado-cafe-e2e` and has a guard against a production cafe ID (`storage.js:28-38`, `253-269`).

**Race / duplicate risk:** The scheme is not an atomic compare-and-swap. Two clients at the same version both skip merge and last writer wins. `mergeStates` makes application-specific guesses (for example, table items choose local non-empty items; role/price have sentinel heuristics) and does not merge all state domains such as refunds, pending bills, inventory logs, recipes, or activity logs. Concurrent writes can therefore lose state or create incompatible financial/inventory outcomes.

**Security / errors:** The UI connection dot becomes green from a timer rather than confirmed subscription state (`StaffApp.jsx:159-160`). Cloud policy and Realtime publication deployment are **UNVERIFIED**.

## 9. Tables

**Actual implementation:** `actions.js` implements `addTable`, `editTable`, `archiveTable`, `deleteTable`, transfer, merge, split, reserve, cleaning, and duplicate-order operations (`actions.js:232-478`). `TablesView`, `TableModal`, and `TableActionsMenu` expose them through `StaffApp.jsx:421-430`.

**Source of truth / enforcement:** Tables are state-blob records; rules are client reducers and UI validation. No active server-side table lifecycle transaction was found.

**Integrity/race risks:** Concurrent table transformations are subject to whole-blob merge rules. The reducers need to be the only caller for invariants, but developer tools expose direct action/state mutation. Table deletion/archiving behavior in the reducer is not an audited server record, and its persistence/protection from E2E cleanup is only client-environment based. Live E2E isolation is **UNVERIFIED**.

## 10. Ordering

**Actual implementation:** Menu components build carts; table order save uses `saveTableOrder`; kitchen status uses `cycleKitchen`; bill generation uses `generateBillForTable` (`actions.js:21-92`, `184-220`; `TableOrderScreen`; `KitchenView`; `BillModal`). Parcel ordering exists separately. Orders are placed in both `orders` and `orderHistory` in `generateBillForTable` (`actions.js:146-148`).

**Source of truth / enforcement:** Cart and table order are browser state then state blob. Menu prices are used to calculate totals in client code. No active server order creation transaction was found.

**Risks:** Transaction snapshots are inconsistent by path: orders hold supplied cart lines and totals; some displays/reports can recalculate from current menu data. No server idempotency key protects duplicate confirmation from independent clients. Error behavior is reducer/UI dependent rather than transaction-bound.

## 11. Payments

**Actual implementation:** `generateBillForTable` creates a completed payment except for `Pending` and conditionally deducts inventory (`actions.js:93-160`). `generatePendingBill`, `payPendingBill`, `createBill`, `updateBillStatus`, and `refundOrder` exist (`actions.js:689-803`, `1259-1314`). `supabase/b10_server_transactions.sql` defines transaction/ledger/refund SQL functions, and `src/lib/serverTransactions.js` contains corresponding client-side helper code.

**Source of truth / enforcement:** Active staff flow uses the state blob reducers. No integration from `StaffApp` to the server transaction helper or SQL RPC was found. Server enforcement is therefore **UNVERIFIED** and not established by SQL-file presence.

**Integrity risks:** `payPendingBill` accepts any `splitBreakdown` without checking its sum equals `grandTotal` and does not append a payment ledger record. Refund authorization relies on caller-supplied role and is client-side; partial refunds mark the whole order `REFUNDED`. Concurrent refunds are not atomic in state blob storage. `generateBillForTable` can be called twice before separate client state converges. These paths cannot prove cash/UPI/card settlement, pending-to-paid once-only revenue, or refund limits across devices.

## 12. Inventory

**Actual implementation:** Inventory create/edit/delete, purchase, adjustment, and automatic recipe deduction are reducers (`actions.js:632-686`, `808-964`), surfaced by `InventoryView`, `InventoryMaster`, `InventoryHistory`, and `StockAdjustmentModal`.

**Source of truth / enforcement:** Inventory and logs are arrays in the JSON state blob. Deduction occurs on selected client-side “paid” paths and uses `orderId`/existing SALE log as an in-memory/blob idempotency guard.

**Integrity risks:** No server transaction links a sale, stock mutation, and ledger payment. Deduction caps stock at zero rather than rejecting insufficient inventory, has a fallback default current quantity of 50, and hard-codes the default organization ID in sale logs (`actions.js:653-680`). Concurrent clients can each deduct based on stale inventory; `mergeStates` chooses one inventory item record and does not merge logs. The opening + purchases − sales − wastage invariant is not enforced as a server-validated calculation.

## 13. Recipes

**Actual implementation:** Recipes are a menu-item-ID-to-ingredient-array object edited in `RecipeBuilder` and saved through `saveRecipe` (`actions.js:840-847`). Decimal arithmetic is supported in `req.qty * itemQty` and rounded to three decimal places in deduction.

**Source of truth / enforcement:** JSON state blob; client component/reducer only.

**Risks:** Missing recipes simply cause no deduction. Ingredient lookup permits ID or name, risking ambiguity. Recipes and inventory logs are not coherently merged in `mergeStates`; cross-device edits/deductions are unsafe. Server-side recipe enforcement is **not implemented in the active path**.

## 14. Backup / Restore

**Actual implementation:** `buildBackupPayload`, `validateBackupPayload`, checksum computation, and snapshot helpers are in `src/lib/backupEngine.js`; Settings imports/exports via browser file APIs and calls `restoreBackup` after validation and a safety snapshot (`SettingsView`, `actions.js:1241-1257`). Validation checks marker, version, cafe ID, E2E/production mismatch, array shapes, and checksum.

**Source of truth / persistence:** Export is a client-generated JSON payload. Safety snapshots are browser-local; restore replaces current application state with backup payload data. No server-side backup store is used by the observed runtime flow.

**Risks / errors:** The checksum is a client integrity check, not a signature; a modified backup can be rechecksummed. Restore authorization is UI/client controlled, and an interrupted or cross-device restore has no transactional database rollback. Whether all state fields are captured and restore behavior succeeds in a real deployment is **UNVERIFIED**.

## 15. AI / API Security

**Actual implementation:** Settings save provider/model/key in localStorage through `src/lib/ai/providerRegistry.js`. `generateAIInsight` builds aggregate business context and calls Gemini, OpenAI, or Anthropic directly from the browser (`src/lib/ai/insightEngine.js`, provider modules).

**Source of truth / persistence:** API key is browser localStorage (`kado_ai_settings`) or a Vite-exposed environment variable. The request includes generated business context.

**Security / errors:** Browser-stored and `VITE_*` API keys are extractable by a user of the deployed application. Provider requests include direct bearer/API-key headers. Error handling maps offline/missing-key/rate-limit/API/malformed-response cases, but `testAIConnection` returns `true` after any nonempty fallback path and does not robustly validate response semantics. No server proxy, key isolation, data minimization review, or production secret configuration was verified.

## 16. Data Integrity

- The system has client-side IDs, client-side action checks, activity logs, backup checksums, E2E environment guards, and proposed SQL transactional/RLS files.
- The active path remains mutable browser state plus a whole-document persistence record. It cannot atomically enforce payment, refund, stock, tenant, or audit invariants across devices.
- `state_version` is advisory; it is not an RPC/database compare-and-swap condition. `mergeStates` is deterministic only for selected collections and does not form an append-only audit ledger.
- Source shows point-in-time test fixtures and prior result documents, but no tests were executed. Their actual pass/fail condition on this ZIP is **UNVERIFIED**.

## 17. P0 Issues

1. **Cloud login privilege escalation path** — `LoginScreen.jsx:43-46` produces an Owner login if `onCloudLogin` is absent; `StaffApp` does not supply it. This is an actual reachable UI fallback, not a documented future concern.
2. **Active runtime does not use normalized tenant/auth transaction model** — `storage.js` operates on `cafe_state`; `schema.sql:20` disables its RLS. Tenant/RLS and payment SQL files cannot protect an active storage path that does not call them. Live schema is **UNVERIFIED**.
3. **Financial and inventory mutations are browser-side, non-atomic whole-state operations** — payments, refunds, and deductions can race across devices; the SQL transaction layer is not wired to StaffApp.
4. **Browser-controlled authorization boundary** — PIN/session/role state is local, UI guards are bypassable, and `window.__kadoUpdate` / `window.__kadoActions` deliberately expose mutation access.
5. **AI keys may be exposed to every browser client** — localStorage and Vite key paths drive direct provider calls.

## 18. P1 Issues

1. `mergeStates` has no atomic precondition and incompletely merges state domains; same-version conflicts remain last-write-wins.
2. Split payment amounts are not validated and pending payment settlement does not write a payment ledger record (`payPendingBill`).
3. Refund role and amount validation are client-only; partial refund marks entire order refunded.
4. Inventory stock and logs are not transactionally coupled to order payment; depleted stock is clamped rather than rejected.
5. Plaintext four-digit PINs and sessions are persisted in browser state/localStorage.
6. Backup validation is unsigned and restore is client-side state replacement; deployment-grade restore safety is unverified.
7. Persistence errors are swallowed, creating an acknowledgement gap between UI and cloud durability.

## 19. P2 Issues

1. Connection status is timer-driven, not subscription-confirmed.
2. Legacy/default organization fallbacks and compatibility allowance for untagged records weaken isolation assumptions.
3. Multiple overlapping models (`users`/`employees`, `orders`/`orderHistory`, `payments`, pending bills) increase reconciliation risk.
4. The current tree mixes tracked and untracked sprint work, so provenance and release composition require a separate source-control reconciliation before any release claim.
5. Test scripts and prior JSON “results” exist, but were not run and cannot establish current functional behavior.

## 20. Previous Sprint Claims That Are Actually Verified

The following are verified **as current source artefacts**, not as deployed or tested outcomes:

- B0.2–B0.8 test/audit documents and `tests/e2e/b02WorkflowTest.js` through `b06HostedProductionAudit.js` exist.
- E2E environment selection and `kado-cafe-e2e` guards exist in `src/lib/env.js` and `src/lib/storage.js`.
- Cloud-state merge code (`mergeStates`) exists in `storage.js`.
- Backup payload construction/validation and Settings restore UI code exist.
- Employee status, roles, editable role permissions, inventory/recipes, pending bills, refunds, and table lifecycle reducers exist.
- Supabase Auth, organization-membership, multitenant RLS, and server-transaction code/SQL exist in source.

## 21. Previous Sprint Claims That Are NOT Verified

- Any E2E, chaos, operational-acceptance, production-readiness, cloud-persistence, backup/restore, S7.1, or S7.2 result is **UNVERIFIED** because no test was run and no live environment was inspected.
- Correct deployment/order of `schema.sql`, `multitenant_schema.sql`, and B10–B16 SQL is **UNVERIFIED**. The files include conflicting posture for `cafe_state` RLS.
- Supabase Auth is not verified as operational; the active StaffApp wiring does not pass a Supabase client to auth initialization or a cloud-login handler to the login UI.
- RLS enforcement, secure sessions, immediate server-authoritative role revocation, organization isolation, atomic payment/refund processing, and production-vs-E2E separation are **UNVERIFIED** in the deployed system.
- Backup recovery, inventory invariants, realtime reliability, and AI secret protection are **UNVERIFIED** in real use.

## 22. Recommended Next Sprint

1. Establish an authoritative production architecture: either migrate StaffApp to tenant-scoped normalized RPCs/RLS or explicitly retire unused claims and SQL. Do not combine legacy unauthenticated `cafe_state` with production tenant claims.
2. Remove Cloud Login’s Owner fallback and wire Supabase Auth end-to-end with server-validated membership/session/role checks. Remove browser authority/debug mutation exports from production builds.
3. Move orders, payments, refunds, and inventory deductions into one tenant-scoped server transaction with idempotency keys and explicit pending/split/refund rules.
4. Replace heuristic whole-blob merge with normalized records, optimistic concurrency at the database boundary, and an append-only financial/inventory audit ledger.
5. Move AI keys and provider calls server-side; scope transmitted data and add tenant/role authorization.
6. Reconcile the dirty ZIP state into reviewed commits without resetting it, then run the existing E2E and scratch checks against an isolated `kado-cafe-e2e` environment. Treat results as new evidence only after execution.
