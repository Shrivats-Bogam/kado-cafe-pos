# Kado Cafe POS — Current Repository Map

> READ-ONLY architecture discovery. No files were modified, no tests were run,
> and no external claims were assumed. Everything below is derived strictly
> from repository inspection of the working tree.
>
> Generated: 2026-08-17 — Branch `bugfix-stabilization-v1` — HEAD `75445c5`

---

## 1. Repository identity

| Field | Value |
|---|---|
| Package name | `kado-cafe` |
| Package version | `1.0.0` |
| Module system | `type: module` (ESM) |
| Build tool | Vite 5 (`vite.config.js`, React plugin) |
| UI stack | React 18.3, Tailwind 3, lucide-react, recharts |
| Cloud dep | `@supabase/supabase-js` 2.45.4 |
| Test dep | `puppeteer` 25 |
| Git branch | `bugfix-stabilization-v1` |
| Git HEAD | `75445c5` |
| Git remote | `https://github.com/Shrivats-Bogam/kado-cafe-pos.git` |
| Entry points | `src/main.jsx` → `src/App.jsx` |
| Deploy target | Netlify (`netlify.toml`, `public/_redirects`) |

npm scripts (package.json):
- `dev` = `vite`, `build` = `vite build`, `deploy` = build + netlify
- `secret-scan` = `node src/lib/secretScanner.js`
- `test:unit` = `node tests/e2e/e2eGuard.js`
- `test:security`, `test:integration`, `test:e2e`, `test:stress`, `test:smoke`, `test:rc`, `test:all` — all invoke `node tests/e2e/*.js` with `VITE_APP_ENV=e2e` and `VITE_CAFE_ID=kado-cafe-e2e`
- `perf` = `node src/performance/measurements.js` (⚠ this file does not exist — see §25)

---

## 2. Complete top-level directory structure

```
kado-cafe-pos-working-copy/
├── .github/workflows/          ci.yml, release-candidate.yml        (UNTRACKED)
├── dist/                       build output (coffee.svg, index.html, _redirects, assets/) (git-ignored)
├── docs/                       audit/report markdown + runbooks + release-gate JSON (mostly UNTRACKED)
├── node_modules/
├── public/                     coffee.svg (tracked), _redirects (UNTRACKED)
├── scratch/                    standalone one-off test scripts (UNTRACKED)
├── src/                        application source (see §3)
├── supabase/                   SQL schema & migrations (schema.sql, multitenant_schema.sql TRACKED; b10–b16 UNTRACKED)
├── tests/                      node/Puppeteer E2E suites (ALL UNTRACKED)
├── .env                        present locally, git-ignored; contains only VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── .env.example                documents VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_ANTHROPIC_API_KEY
├── .gitignore
├── RELEASE_NOTES.md            (tracked)
├── TEST_CHECKLIST.md           (tracked)
├── implementation_plan.md      (UNTRACKED) Sprint B0.2 plan
├── index.html
├── netlify.toml                build=dist, SPA redirect
├── package.json / package-lock.json
├── postcss.config.js
├── sanitize.ps1                BOM/CRLF cleanup helper
├── tailwind.config.js
├── vite.config.js
```

---

## 3. src/ architecture

```
src/
├── main.jsx                    React root bootstrap
├── App.jsx                     top-level router: StaffApp (default) or CustomerOrderPage (?table=<id>)
├── index.css
├── components/                 presentational + feature components (Staff POS)
│   └── reports/                10 report sub-components
├── data/
│   ├── defaults.js             defaultState(), ROLE_TABS, ROLE_LABELS, default tables/menu/employees/customers/inventory/recipes/settings
│   └── menu.js                 defaultMenu(), CATEGORIES
├── lib/                        pure business logic, helpers, engines
│   └── ai/                     multi-provider AI layer (providers/, contextBuilder, insightEngine, providerRegistry)
├── performance/                profilerCallback.js (utility only)
├── state/
│   ├── actions.js              pure reducer-style action functions (single source of business rules)
│   ├── snapshot.js             kitchen/order status snapshot diffing helper
│   └── kitchenRealtime.js      status-change toasts + WebAudio chimes
└── views/                      screen-level views rendered by StaffApp / App
```

Key roles:
- `src/state/actions.js` — the ONLY place business mutations live (pure `(state, …args) => state`).
- `src/lib/storage.js` — the ONLY persistence layer (localStorage + optional Supabase JSON blob + realtime).
- `src/lib/auth.js` — Supabase-auth identity + org-membership resolver (see §6).
- `src/lib/session.js` — tiny localStorage session + UI-state persistence.

---

## 4. React component / view architecture

- `src/App.jsx` — two top-level modes:
  - `/` → `<StaffApp />`
  - `/?table=<id>` → `<CustomerOrderPage tableId={id} />` (customer scan-to-order, poll-based)
  - Wrapped in `<ErrorBoundary>` and `<OfflineBanner>`.
- `src/components/StaffApp.jsx` (628 lines) — the staff shell. Owns the single React state copy,
  the login gate, tab routing, realtime subscription, session/UI persistence, and passes
  `update(...)` bound to `actions.*` down to views.

Tab → view mapping in `StaffApp.jsx`:

| Tab | View |
|---|---|
| dashboard | `views/Dashboard.jsx` |
| tables | `views/TablesView.jsx` → `views/TableOrderScreen.jsx` (full-screen order/bill) |
| kitchen | `views/KitchenView.jsx` |
| parcel | `views/ParcelView.jsx` |
| menu | `views/MenuManageView.jsx` |
| inventory | `views/InventoryView.jsx` |
| customers | `views/CustomersView.jsx` |
| insights | `views/AIInsightsView.jsx` |
| reports | `views/ReportsView.jsx` |
| employees | `views/EmployeesView.jsx` |
| settings | `views/SettingsView.jsx` (also `SettingsPanel.jsx` modal) |

Notable present-but-unreachable views:
- `views/BillingView.jsx` (+ `components/BillingHistory.jsx`, `CheckoutPanel.jsx`, `InvoicePreview.jsx`, `MenuPicker.jsx` reuse) — TRACKED but **not imported by StaffApp** (only imported by itself). No UI path reaches it.
- `views/OperationalMonitoringView.jsx`, `views/SystemIncidentView.jsx` — UNTRACKED, exported, **imported nowhere** in the app (no tab wired).

Other full-screen/modal components wired from StaffApp: `Calculator.jsx`, `TableQRModal.jsx` (QR code manager `QRCodeManager.jsx` is imported by TableQRModal), `Toaster.jsx`.

---

## 5. State management architecture

- Single React state object in `StaffApp.jsx` (`const [state, setStateRaw] = useState(null)`).
- Hydration: `getState()` JSON is spread over `defaultState()` (`StaffApp.jsx:65-82`).
- Mutations: `const update = (apply) => setStateRaw((prev) => apply(prev))` (`StaffApp.jsx:208`).
  Views call `actions.*` directly (imported as `* as actions`); most call through tiny wrappers
  (e.g. `addTable`, `cycleKitchen`, `generateBillForTable`).
- Persistence effect: any `state` change after `loaded` calls `setState(JSON.stringify(state))`
  (`StaffApp.jsx:99-103`); `skipNextSave.current` suppresses realtime echoes.
- Remote-change application: realtime callback + 90s polling + `storage` event merge remote into
  local with `{ ...defaultState(), ...prev, ...JSON.parse(json) }` (`StaffApp.jsx:112-157`).
- `window.__kadoUpdate` and `window.__kadoActions` are exposed on the global for debugging/tests
  (`StaffApp.jsx:209-212`).
- Pure actions live in `src/state/actions.js` (pure functions, no React dependency).
- No Redux/Zustand/Context; plain `useState` + effect-write.

---

## 6. Authentication and session flow

**Active runtime (used today):**
1. `StaffApp.jsx:50` hydrates `currentUser` from `loadSession()` (`src/lib/session.js`,
   localStorage key `kado-cafe-session`). No expiry; logout clears it.
2. On load, `initializeAuthSession()` is called **with no arguments** (`StaffApp.jsx:68`).
3. If `currentUser` is null → `<LoginScreen>` with PIN keypad (`src/components/LoginScreen.jsx`).
   - Staff list = `state.employees` (authoritative) merged with legacy `state.users`,
     filtered by `filterProductionAccounts` (`StaffApp.jsx:214-239`).
   - PIN match is a plain string equality against `employee.pin` (`LoginScreen.jsx:15-23`).
   - On login, StaffApp re-looks-up the authoritative `state.employees` record and stores
     `{ id, name, role, pin, status }` into `currentUser` + session localStorage
     (`StaffApp.jsx:244-268`).
4. Session is re-validated against `state.employees` on every state change; a disabled employee
   is force-logged-out (`StaffApp.jsx:171-195`).
5. Tab access is gated by `ROLE_TABS[role]` from `src/data/defaults.js`.

**Present but NOT wired (Supabase Auth path):**
- `src/lib/auth.js` defines `loginWithEmail`, `signInWithPassword`, `resolveOrganizationMembership`,
  `initializeAuthSession(supabaseClient)`, `logoutUser(supabaseClient)` — but **no supabase client is
  ever passed** to these in the runtime. `StaffApp` calls `initializeAuthSession()` with no arg, so it
  always falls through to the DEFAULT single-tenant fallback session
  (`{ user: "local-user-owner", organization_id: DEFAULT_ORGANIZATION_ID, role: "Owner" }`).
- `LoginScreen.jsx` renders a "Cloud Account Login" email/password form, but `StaffApp` never passes
  `onCloudLogin`, so the submit falls back to a simulated `{ role: "Owner", pin: "0000" }` login
  (`LoginScreen.jsx:41-46`). **No real server auth is performed in the active app.**
- `logoutUser` is imported by StaffApp but the component defines its own `logout()` that only calls
  `clearSession()`/`saveUIState()` (`StaffApp.jsx:323-328`).
- `tests/auth/b09Phase1AuthSecurity.js` exercises the auth module in isolation.

---

## 7. Employee / role / RBAC flow

- Data model: `state.employees` (authoritative, created via `actions.addEmployee`,
  `actions.editEmployee`, `actions.toggleEmployeeStatus` — `src/state/actions.js:970-1099`) and a
  **shadow/legacy** `state.users` array kept in sync by those same actions.
- Roles: `Owner, Manager, Staff, Kitchen, Waiter, Cashier` (see `ROLE_TABS` in `defaults.js`, and
  `organization_members.role` CHECK in SQL which allows `Owner, Manager, Cashier, Waiter, Kitchen, Staff`).
- Tab RBAC: `ROLE_TABS` (`src/data/defaults.js:5-12`).
- Permission matrix (library): `ROLE_PERMISSIONS` + `hasPermission(role, key)` in
  `src/lib/multitenant.js:118-170`. ⚠ This matrix is **not referenced by any component** in the app
  (grep for `hasPermission(` returns only the definition).
- UI-level permissions: `defaultRolePermissions()` in `defaults.js:201-210` + `updateRolePermissions`
  action + `components/RolePermissions.jsx` (wired through `EmployeesView.jsx`).
- Refund guard: `actions.refundOrder` enforces Owner/Manager (see §11).
- PIN uniqueness enforced in `addEmployee`/`editEmployee` (throws).
- Shift clock-in/out: `actions.clockInShift` / `clockOutShift`, UI in `components/ShiftManager.jsx`
  (wired in `EmployeesView.jsx`).
- Duplicate/overlapping models exist here: `state.employees` vs `state.users` vs (relational)
  `organization_members` — see §22.

---

## 8. Supabase client and persistence flow

Single Supabase client is created **only** in `src/lib/storage.js:46-71`:
- Enabled when both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set, URL starts with
  `https://`, and does not contain `your-project-ref`.
- Created with `{ auth: { persistSession: false, autoRefreshToken: false } }` — the client is used
  **only as a data API**, never for auth in the active runtime.
- `CAFE_ID` defaults to `kado-cafe`, or `kado-cafe-e2e` when `IS_E2E`.
- `LS_KEY` defaults to `kado-cafe-state` / `kado-cafe-e2e-state`.
- Hard safety guard: if `IS_E2E && CAFE_ID === "kado-cafe"`, the module throws at import time
  (`storage.js:36-38`).
- All writes serialize through an in-module promise chain (`serializeWrites`).

Functions (`src/lib/storage.js`):
- `getState()` — reads `cafe_state.data` row by `cafe_id` (falls back to localStorage).
- `setState(jsonString)` — version-stamps `_v`, bumps `state_version`, writes localStorage first,
  then calls RPC `upsert_cafe_state(p_cafe_id, p_data)`; falls back to table `.upsert()` on RPC error;
  performs optimistic-lock compare with remote `state_version` and `mergeStates()` on conflict.
- `mergeStates(local, remote)` — 3-way domain merger by id for menuItems/tables/employees/users/
  orders/payments/inventory (domain-specific heuristics, `storage.js:129-247`).
- `subscribeToChanges(onChange, onStatus)` — realtime channel `cafe_state_changes` on
  `postgres_changes` filtered by `cafe_id=eq.<CAFE_ID>`; also updates `lastFetched`.
- `isCloudEnabled` export.

⚠ No `organization_id` filtering on the `cafe_state` table reads/writes in storage.js — the state
row is keyed purely by `cafe_id`. Tenant ownership is only stamped into the JSON (`organization_id`
field via `tagTenantOwnership`), not used to partition cloud reads.

---

## 9. cafe_state usage

- **Table/function references** (all in `src/lib/storage.js` unless noted):
  - `cafe_state` table read: `storage.js:107`
  - `cafe_state` conflict check read: `storage.js:296`
  - RPC `upsert_cafe_state`: `storage.js:307` (defined in `supabase/schema.sql:39-47`)
  - table `.upsert` fallback: `storage.js:314`
  - realtime `postgres_changes` on table `cafe_state`: `storage.js:340`
- `supabase/schema.sql` defines `cafe_state(cafe_id PK, data jsonb, updated_at)`, RLS **disabled**
  (explicit comment: safe only for single-owner private project), `touch_cafe_state` trigger,
  `upsert_cafe_state` RPC, default row for `kado-cafe`, and `alter publication supabase_realtime
  add table cafe_state`.
- The whole domain lives in `data` JSONB column — **the app is a document/JSON store, not relational**.
- `supabase/multitenant_schema.sql` contains a migration function `migrate_cafe_state_to_multitenant`
  that reads from `cafe_state` — it is a SQL-side migration helper, not invoked by the app.

---

## 10. organization / tenant architecture

Client (`src/lib/multitenant.js`):
- `DEFAULT_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001"`.
- Module-level mutable `currentOrganizationId`; `getOrganizationId()` / `setOrganizationId()`.
- `createOrganizationModel`, `canTenantOperate` (subscription lifecycle), `tagTenantOwnership`,
  `validateTenantAccess`, `filterTenantRecords`, `ROLE_PERMISSIONS`, `hasPermission`.

Wiring status:
- `setOrganizationId` is called by `auth.js` (cached membership or fallback) and by `loginWithEmail`.
- `tagTenantOwnership` is called by `storage.js:tagWithVersion` on every state write → every state
  blob gets a top-level `organization_id`.
- `inventoryLogs` written by actions carry `organization_id` stamps (`actions.js:667, 880, 941`).
- ⚠ Tenant isolation is a **tag/flag only in the active runtime**. `cafe_state` reads/writes do not
  filter by organization; RLS on `cafe_state` is disabled in `schema.sql`. The relational tenant
  tables + RLS policies exist only in SQL files that are not applied by the app.

Database (`supabase/multitenant_schema.sql`):
- `organizations`, `organization_members` (UNIQUE(organization_id, pin_code)), `pos_organization_settings`,
  `pos_tables`, `pos_orders`, `pos_order_items`, `pos_bills`, `pos_payments`, `pos_kitchen_tickets`,
  `pos_categories`, `pos_menu_items`, `pos_inventory_items`, `pos_recipes`, `pos_inventory_logs`,
  `pos_customers`, `pos_loyalty_transactions`, `pos_parcel_orders`, `pos_activity_logs`, `pos_backups`.
- RLS helper `auth.current_organization_id()` (reads JWT claim, else first active membership, else
  default org) and tenant-isolation policies created in a DO block.
- Seeds the default org row and defines `migrate_cafe_state_to_multitenant`.
- `supabase/b11_multitenant_saas.sql` adds `pos_organization_invitations`, `provision_organization_transaction`,
  and tenant-switch validation RPCs (head reviewed only).

---

## 11. Payments and refunds flow

**Active runtime (client-authoritative):**
- Bill settlement: `views/TableOrderScreen.jsx` → `BillModal.jsx` (`onConfirm(paymentMode, phone,
  redeemedPoints)`) → `StaffApp.generateBillForTable` → `actions.generateBillForTable`
  (`src/state/actions.js:93-162`).
  - Creates order record, optional payment record (`pay_<billId>`, mode, status `completed`),
    pushes to `orders` + `orderHistory`, applies loyalty, deducts stock ONLY when not Pending,
    resets the table.
  - `paymentMode === "Pending"` → status `PENDING`, no payment record, **no stock deduction**.
- Pending-bill settlement actions exist: `generatePendingBill` (`actions.js:761`), `payPendingBill`
  (`actions.js:783` — deducts stock, moves to orderHistory with `paymentBreakdown` for splits).
  ⚠ **No view/component calls them** — they are only exercised by `src/lib/bugFixTest.js`.
- Refunds:
  - `actions.refundOrder(state, orderId, refundAmount, reason, staffRole)` (`actions.js:1259-1315`)
    — Owner/Manager only; validates against `state.refunds` + `state.payments`, marks order
    `REFUNDED`, appends negative payment record. ⚠ **Not wired to any view.**
  - `BillingHistory.jsx:235-240` has a "Refund" button calling `onUpdateBillStatus(bill.id,
    "Refunded")` → `actions.updateBillStatus` — but `BillingView.jsx` (the only consumer of
    `BillingHistory`) is **not reachable** from the active app.
- Payments recorded in state: `state.payments` array (per-bill records).

**Present but NOT wired (server-authoritative):**
- `src/lib/serverTransactions.js` — `executeServerPayment`, `executeServerSplitPayment`,
  `executeServerRefund`, `createTransactionIdempotencyKey`. These call RPCs
  `settle_payment_transaction`, `settle_split_payment_transaction`, `process_refund_transaction`,
  with offline guards (never claim success offline) and idempotency keys. **Imported nowhere in the
  app** (only referenced by tests).
- `supabase/b10_server_transactions.sql` defines the matching ledger/refund/idempotency tables
  (`pos_financial_ledger`, `pos_refunds`, `pos_idempotency_keys`, ...) and RPCs (head reviewed).

---

## 12. Order lifecycle

1. **Save/Send to kitchen** — `actions.saveTableOrder` (`actions.js:21-91`): diffs cart vs already-sent
   `kitchenTickets`, creates delta kitchen tickets (`kt_*`), sets table status, kitchenStatus,
   priority; parcels handled by `actions.createParcel` / `updateParcelStatus` (`actions.js:484-518`).
2. **Kitchen status cycling** — `actions.cycleKitchen` (`actions.js:184-219`) for tables and parcels;
   `setTablePriority` (`actions.js:221`). Kitchen UI: `views/KitchenView.jsx`.
3. **Bill** — `generateBillForTable` (see §11); optional `Pending` status.
4. **Payment** — recorded client-side (see §11).
5. **Order history** — `state.orderHistory` is the historical ledger; `state.orders` also mirrors
   the newest record. Both updated in `generateBillForTable`.
6. **Refund/cancel** — `refundOrder` / `updateBillStatus(…, "Refunded")` (see §11).
7. **Customer self-service** — `views/CustomerOrderPage.jsx` (poll every 4s) submits orders by
   writing directly to `setState` (bypasses `actions.*`), creates kitchen tickets inline, and manages
   assistance requests + feedback.

Duplicate order models: `state.orders` (recent), `state.orderHistory` (full history), `state.pendingBills`
— see §22.

---

## 13. Inventory and recipe flow

- **Recipe (BOM) model**: `state.recipes = { [menuItemId]: [{ ingredientId, ingredientName?, qty }] }`.
  Defaults in `defaults.js:defaultRecipes()`; edited via `actions.saveRecipe` (`actions.js:840`).
- **Stock deduction**: `actions.deductStockForOrderItems(inventory, recipes, inventoryLogs, items,
  orderId)` (`actions.js:633-687`):
  - Idempotency guard: skips if a `SALE` log already references the same orderId/orderRef.
  - Looks up recipe by `menuItemId`, decrements `qty`/`currentStock` (floor at 0), writes a `SALE`
    inventory log with both `orderRef` and `orderId` fields.
- Called from: `generateBillForTable` (paid only), `createBill` (paid), `updateBillStatus`
  (Pending→Paid), `payPendingBill` (see §11/§12).
- **Purchases**: `actions.addPurchaseEntry` (`actions.js:850`) — increases stock, writes `PURCHASE` log.
- **Adjustments**: `actions.adjustStock` (`actions.js:908`) — ADJUSTMENT (set) or consumption
  (decrement), writes typed log.
- **UI**: `views/InventoryView.jsx` → `InventoryMaster.jsx`, `RecipeBuilder.jsx`,
  `StockAdjustmentModal.jsx`, `InventoryHistory.jsx`, `InventoryDashboard.jsx`.
- Inventory log stamps a hard-coded default `organization_id` in `deductStockForOrderItems`
  (`actions.js:667`), but uses `state.organization_id` in purchase/adjust (mixed behavior).

---

## 14. Table management flow

- Table state lives in `state.tables` (default `defaultTables(7)`).
- `actions` (all in `src/state/actions.js`):
  - `setTableStatus` (164), `reserveTable` (374), `setTableCleaning` (386), `archiveTable`/`deleteTable`
    (471-480, archive semantics), `addTable` (437), `editTable` (464),
  - `transferTable` (232), `mergeTables` (268), `splitTable` (318), `duplicateTableOrder` (412),
  - `saveTableOrder`, `cycleKitchen`, `setTablePriority` (see §12).
- UI: `views/TablesView.jsx` → `TableCard.jsx`, `TableModal.jsx`, `TableActionsMenu.jsx`,
  `TableFilters.jsx`, `TableSearch.jsx`, `TableStats.jsx`, `TableStatusBadge.jsx`,
  `TableCapacityPicker.jsx`, `views/TableQRModal.jsx` (QR codes via `components/QRCodeManager.jsx`
  + `lib/qr.js`).
- Statuses in `TABLE_STATUS` (`defaults.js:22-33`): available, ordering, preparing, serving, ready,
  billing, payment_pending, reserved, cleaning, closed.
- Customer QR entry: `App.jsx` reads `?table=<id>` → `CustomerOrderPage`.

---

## 15. Backup / restore architecture

`src/lib/backupEngine.js`:
- `BACKUP_MARKER = "KADO_CAFE_BACKUP"`, `BACKUP_VERSION = 1`, `SCHEMA_VERSION = 1`, `APP_VERSION = "1.0.0"`.
- `buildBackupPayload(state)` (line 32) — whitelists business entities (settings, tables, menuItems,
  categories, parcels, orders, pendingBills, payments, refunds, orderHistory, customers,
  customerFeedback, assistanceRequests, employees, users, rolePermissions, shifts, activityLogs,
  expenses, inventory, recipes, inventoryLogs); adds checksum via `computeChecksum`.
- `validateBackupPayload(backupObj, targetCafeId = CAFE_ID)` (line 110) — validates marker, schema
  version, **cafe_id cross-environment guard**, payload shape, and checksum.
- `createPreRestoreSnapshot(state)` (line 183) — auto-snapshot to localStorage before restore,
  max 5 snapshots registry.
- `getSafetySnapshots()` (line 221), `verifyRestoredState(restoredState)` (line 234).
- **Wired into UI**: `src/views/SettingsView.jsx` imports `buildBackupPayload` + `validateBackupPayload`
  (lines 11-12), exports a backup on line 773, and validates an imported file on line 977.
- Restore applies `actions.restoreBackup` (`actions.js:1241-1257`), which resets to `defaultState()`
  then spreads restored data.

---

## 16. Realtime synchronization

- **Supabase realtime**: `subscribeToChanges` in `storage.js:331-357` opens channel
  `cafe_state_changes` on `postgres_changes` for `cafe_state` filtered by `cafe_id`. Requires the
  schema's `alter publication supabase_realtime add table cafe_state` to be applied.
- **Client handling** (`StaffApp.jsx:106-168`):
  - Realtime callback merges incoming JSON over current state, sets `skipNextSave`, fires kitchen
    toasts (`fireStatusToasts` from `state/kitchenRealtime.js`), updates snapshot.
  - 90-second polling fallback (`refetchAndApply`) catches dead sockets.
  - `storage` event listener for multi-tab localStorage sync (local mode).
  - Realtime only activates once `currentUser` is set (login gate).
- **Toast/sound side-effects**: `src/state/kitchenRealtime.js` — `fireStatusToasts` (diff of
  `snapshotStatuses`) + `playSound` (WebAudio chimes for new/ready/rush).
- **Customer side**: `CustomerOrderPage.jsx` polls every 4s (no realtime subscription).

---

## 17. AI / provider architecture

- `src/lib/ai/providerRegistry.js` — `DEFAULT_AI_SETTINGS` (provider `gemini`, model
  `gemini-1.5-flash`), `PROVIDERS` (gemini/openai/anthropic), `getAISettings`/`saveAISettings`
  (localStorage `kado_ai_settings`), `getEffectiveAPIKey` (env vars `VITE_GEMINI_API_KEY`,
  `VITE_OPENAI_API_KEY`, `VITE_ANTHROPIC_API_KEY`, `VITE_AI_API_KEY`).
- `src/lib/ai/insightEngine.js` — `generateAIInsight(state, period, options)` builds a structured
  prompt from business context, calls the selected provider, enforces a strict JSON schema, caches;
  `testAIConnection`.
- `src/lib/ai/contextBuilder.js` — `buildStructuredBusinessContext(state, period)` aggregates
  revenue/product/hourly/channel/inventory metrics (privacy-minimized, no PII).
- `src/lib/ai/providers/{gemini,openai,anthropic}.js` — thin HTTP call wrappers (direct fetch to
  provider REST endpoints; **no server proxy**).
- Facade `src/lib/ai.js` re-exports + legacy `generateInsights` wrapper.
- Wired into: `views/AIInsightsView.jsx` (Insights tab) and `views/SettingsView.jsx` (AI settings /
  test connection).
- ⚠ Note: keys ship in the client bundle (documented tradeoff in `.env.example`).

---

## 18. Existing test suites

All under `tests/` (UNTRACKED), Node ESM + Puppeteer against `http://localhost:5173` (requires a
running `npm run dev`), guarded by `tests/e2e/e2eGuard.js` (`assertE2EEnvironment`, aborts if it
detects production `kado-cafe`/non-e2e).

| File | Scope |
|---|---|
| `tests/e2e/e2eGuard.js` | environment safety guard (also `test:unit`) |
| `tests/e2e/b02WorkflowTest.js` | full UI workflow + persistence audit |
| `tests/e2e/b03OperationalAcceptance.js` | operational acceptance |
| `tests/e2e/b04ProductionReadiness.js` | production readiness |
| `tests/e2e/b05ChaosAudit.js` | chaos audit |
| `tests/e2e/b06HostedProductionAudit.js` | hosted/production audit |
| `tests/e2e/b10TransactionSecurity.js` | server transaction security (RPC simulation) |
| `tests/e2e/b11MultiTenantSecurity.js` | multi-tenant isolation |
| `tests/e2e/b11PuppeteerIsolation.js` | browser-isolation guard |
| `tests/e2e/b12ObservabilityAudit.js` | observability schema audit |
| `tests/e2e/b13StressAudit.js` | high-load stress (uses `scalableDataEngine`) |
| `tests/e2e/b14DeploymentAudit.js` | deployment/DR audit |
| `tests/e2e/b15ProductionSmoke.js`, `b15ReleaseCandidate.js` | smoke + 25-gate RC |
| `tests/e2e/b16IncidentReliability.js`, `b16PaymentFailure.js`, `b16ProductionSmoke.js` | incidents |
| `tests/e2e/b17RealWorldUX.js` | real-world UX |
| `tests/e2e/b18BackupDR.js`, `b18EnvironmentGuard.js` | backup/DR + env guard |
| `tests/e2e/b19RealCafeOperations.js` | real café operations |
| `tests/e2e/b20ProductionDatabase.js`, `b20ProductionEnvironment.js` | production DB/env |
| `tests/e2e/b21BackupOperations.js`, `b21MigrationSafety.js`, `b21TenantLifecycle.js` | ops/migration/tenant lifecycle |
| `tests/auth/b09Phase1AuthSecurity.js` | auth module security (Node-level, no browser) |

In-repo unit-ish self-tests (Node, import the actions/lib directly, run on demand):
- `src/lib/bugFixTest.js`, `src/lib/authTest.js`, `src/lib/multitenantTest.js`,
  `src/lib/b02WorkflowTest.js`, `src/lib/shiftSimulation.js`, `src/lib/benchmark.js` — none are
  invoked by npm scripts.

CI (`.github/workflows/ci.yml`, UNTRACKED): secret-scan → e2eGuard → b11 → b10 → b12 → build.
Release gate (`release-candidate.yml`): b15ReleaseCandidate + build + artifact upload.

---

## 19. Existing scratch / audit scripts

`scratch/` (UNTRACKED), standalone Puppeteer/Node scripts (not wired into package.json):
- `test_b07_cloud_sync.js` — multi-browser cloud persistence/reliability (uses `/?env=e2e`).
- `test_b08_gap_audit.js`, `test_b08_integrity.js` — gap + integrity audits.
- `test_b09_security.js` — security audit.
- `test_e2e_isolation_and_roles.js` — isolation + role checks.

---

## 20. Existing SQL / migrations (`supabase/`)

| File | Tracked | Contents (summary) |
|---|---|---|
| `schema.sql` | YES | `cafe_state` JSON blob table (RLS disabled), touch trigger, `upsert_cafe_state` RPC, realtime publication |
| `multitenant_schema.sql` | YES | `organizations`, `organization_members`, `pos_*` relational tables, RLS + tenant policies, default org seed, `migrate_cafe_state_to_multitenant` |
| `b10_server_transactions.sql` | NO | `pos_financial_ledger`, `pos_refunds`, `pos_idempotency_keys` + settle/refund RPCs |
| `b11_multitenant_saas.sql` | NO | `pos_organization_invitations`, `provision_organization_transaction`, tenant-switch RPCs |
| `b12_observability_schema.sql` | NO | `pos_security_events`, `pos_error_logs` + RLS |
| `b13_indexes_and_perf.sql` | NO | composite indexes + `aggregate_dashboard_metrics` RPC |
| `b14_deployment_dr.sql` | NO | `pos_deployments` + RLS |
| `b16_incidents_schema.sql` | NO | `pos_incidents` + RLS + dedup index |

⚠ Only `schema.sql` is exercised by the active app (the `cafe_state`/`upsert_cafe_state`/realtime
contract). `multitenant_schema.sql` is tracked but its tables are not written by the active app;
b10–b16 are entirely unapplied artifacts supporting the audit suites. **None of these are applied by
any migration tool in the repo** (no migration runner; SQL is pasted manually per file comments).

---

## 21. Environment variables and configuration

`.env` (local, git-ignored) — contains only:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

`.env.example` documents additionally: `VITE_ANTHROPIC_API_KEY` (client-shipped, deprecated path).

Read at runtime:
- `src/lib/env.js`: `VITE_APP_ENV` (also `window.__KADO_APP_ENV` / `?env=e2e`), `APP_ENV`, `IS_E2E`,
  `IS_PRODUCTION`, plus E2E account/table filtering helpers.
- `src/lib/storage.js`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CAFE_ID`, `VITE_LS_KEY`.
- `src/lib/ai/providerRegistry.js`: `VITE_GEMINI_API_KEY`, `VITE_OPENAI_API_KEY`,
  `VITE_ANTHROPIC_API_KEY`, `VITE_AI_API_KEY`.

Build/deploy config: `vite.config.js` (host true, port 5173), `netlify.toml`
(command `npm run build`, publish `dist`, SPA `/* → /index.html`), `postcss.config.js`,
`tailwind.config.js`, `public/_redirects`.

---

## 22. Important duplicate / overlapping state models

1. **`state.orders` vs `state.orderHistory`** — `generateBillForTable` writes the same new record to
   both (`actions.js:146-148`). Readers differ (dashboard uses `orderHistory`; refund lookup checks
   both). Overlap risk on status mutations.
2. **`state.employees` vs `state.users`** — `employees` is authoritative; `users` is a legacy mirror
   kept in sync by add/edit/toggle actions and by `addUser`/`removeUser`. Login merges both
   (`StaffApp.jsx:214-239`). Duplicate identity sources for the same person.
3. **`state.pendingBills` vs `state.orderHistory`/`orders`** — pending bills are a separate array;
   `payPendingBill` converts one into a history record. `generateBillForTable` with `Pending` does
   NOT use `pendingBills` (it writes a PENDING order into orders+orderHistory instead) — two
   different "pending" flows.
4. **`state.payments` vs payment fields inside orders** — payment facts live both on the order
   record (`paymentMode`, `paidAt`) and in `state.payments` (separate `pay_<billId>` records).
5. **`state.inventory[*].qty` vs `currentStock`** — inventory items carry both `qty` (legacy) and
   `currentStock` (new); deduction code reads `qty` first, then `currentStock`, and writes both.
6. **`state.recipes` object-keyed BOM vs relational `pos_recipes`** — client uses object keyed by
   menuItemId; SQL defines a relational table not used by the app.
7. **Tenant identity**: `state.organization_id` stamp vs `cafe_id` key vs `organization_members`
   relational — three notions of "which café".
8. **Roles/permissions**: `ROLE_TABS` (defaults.js), `ROLE_PERMISSIONS` (multitenant.js), and
   `state.rolePermissions` (defaults.js + updateRolePermissions) — three parallel permission systems;
   only `ROLE_TABS` is enforced in the UI.

---

## 23. Security-sensitive code paths

- **PIN-based auth** (`LoginScreen.jsx`, `StaffApp.jsx:244-268`, `session.js`): 4-digit PINs stored in
  plaintext in `state.employees[].pin` / `state.users[].pin`, persisted in the state blob and in
  `kado-cafe-session` localStorage. No hashing, no rate limiting.
- **Anon key / RLS**: `cafe_state` has RLS **disabled** (`schema.sql:20`) — the anon key can
  read/write the entire state JSON including employees/PINs/customers. Explicitly documented as MVP-only.
- **AI API keys in client bundle** (`.env.example` warning; `providerRegistry.js` reads
  `import.meta.env.VITE_*_API_KEY`).
- **`window.__kadoActions` / `window.__kadoUpdate`** exposed globally (`StaffApp.jsx:209-212`).
- **Refund authorization** only enforced in `actions.refundOrder` (Owner/Manager) — the UI path
  (`BillingHistory` → `updateBillStatus "Refunded"`) has **no role check** in the action.
- **`tagTenantOwnership`** stamps org id but `setState` never rejects cross-tenant writes
  (RLS disabled; no client-side enforcement of `organization_id` on `cafe_state`).
- **Puppeteer E2E guard** (`tests/e2e/e2eGuard.js`) + import-time hard abort (`storage.js:36-38`) +
  `setState` production/E2E write guards (`storage.js:254-271`) are the main protective rails.
- **`secretScanner.js`** (`src/lib/secretScanner.js`, UNTRACKED) runs in CI to scan for exposed secrets.
- **Sanitizers**: `observability.js:sanitizeLogData` redacts PIN/password/secret/token/phone before
  logging incidents.

---

## 24. Files tracked versus untracked

**Tracked (committed), with local modifications** (from `git status --short`, `M`):
`netlify.toml`, `package-lock.json`, `package.json`, and under `src/`:
`components/BillModal.jsx`, `components/BillingHistory.jsx`, `components/EmployeeDirectory.jsx`,
`components/EmployeeModal.jsx`, `components/ErrorBoundary.jsx`, `components/InventoryHistory.jsx`,
`components/InventoryMaster.jsx`, `components/LoginScreen.jsx`, `components/MenuPicker.jsx`,
`components/RecipeBuilder.jsx`, `components/StaffApp.jsx`, `components/StockAdjustmentModal.jsx`,
`components/TableCapacityPicker.jsx`, `components/TableCard.jsx`, `components/TableModal.jsx`,
`components/ui.jsx`, `data/defaults.js`, `lib/ai/providerRegistry.js`, `lib/auth.js`,
`lib/backupEngine.js`, `lib/multitenant.js`, `lib/storage.js`, `state/actions.js`,
`views/InventoryView.jsx`, `views/MenuManageView.jsx`, `views/SettingsView.jsx`,
`views/TableOrderScreen.jsx`, `views/TablesView.jsx`.

**Tracked (committed, unmodified) notable**: `src/lib/session.js`, `src/lib/ai/*`, `src/lib/qr.js`,
`src/lib/reportsAggregate.js`, `src/lib/loyalty.js`, `src/lib/currency.js`, `src/lib/id.js`,
`src/state/snapshot.js`, `src/state/kitchenRealtime.js`, `src/views/BillingView.jsx` (dead code but
committed), `supabase/schema.sql`, `supabase/multitenant_schema.sql`, `RELEASE_NOTES.md`,
`TEST_CHECKLIST.md`, `docs/BUG_HUNT_REPORT.md`, `.env.example`.

**Untracked (new, not committed)** — `??`:
- `.github/workflows/` (ci.yml, release-candidate.yml)
- `docs/` — all audit docs (B0.2–B2.1), runbooks, `CURRENT_REALITY_AUDIT.md`, `release-gate-result.json`
- `implementation_plan.md`, `public/_redirects`, `scratch/`
- `src/lib/`: `b02WorkflowTest.js`, `deploymentDR.js`, `deploymentHealth.js`, `env.js`,
  `incidentEngine.js`, `observability.js`, `productionHealth.js`, `scalableDataEngine.js`,
  `secretScanner.js`, `serverTransactions.js`
- `src/views/`: `OperationalMonitoringView.jsx`, `SystemIncidentView.jsx`
- `supabase/`: `b10_server_transactions.sql`, `b11_multitenant_saas.sql`, `b12_observability_schema.sql`,
  `b13_indexes_and_perf.sql`, `b14_deployment_dr.sql`, `b16_incidents_schema.sql`
- `tests/` — everything (auth + e2e)
- `.env` (git-ignored, present), `dist/` (git-ignored build output)

---

## 25. Classification of code by wiring status

### ACTIVE runtime code (reachable from `main.jsx`)
- `src/App.jsx`, `src/main.jsx`
- `src/components/StaffApp.jsx` (shell, login gate, realtime, persistence)
- `src/components/LoginScreen.jsx` (PIN login; cloud form is fallback-only — see §6)
- `src/views/Dashboard.jsx`, `TablesView.jsx`, `TableOrderScreen.jsx`, `KitchenView.jsx`,
  `ParcelView.jsx`, `MenuManageView.jsx`, `InventoryView.jsx`, `CustomersView.jsx`,
  `AIInsightsView.jsx`, `ReportsView.jsx`, `EmployeesView.jsx`, `SettingsView.jsx` +
  `SettingsPanel.jsx`, `TableQRModal.jsx`, `Calculator.jsx`
- `src/views/CustomerOrderPage.jsx` (+ customer components) — reachable via `?table=`
- `src/state/actions.js` (the mutation layer), `src/state/snapshot.js`, `src/state/kitchenRealtime.js`
- `src/lib/storage.js` (persistence + realtime client), `src/lib/session.js`,
  `src/lib/auth.js` (only `initializeAuthSession()` fallback path is active), `src/lib/env.js`,
  `src/lib/multitenant.js` (tag/org-id + defaults; permission matrix NOT enforced),
  `src/lib/backupEngine.js` (via SettingsView backup/restore),
  `src/lib/ai.js` + `src/lib/ai/**` (Insights tab + Settings),
  `src/lib/currency.js`, `src/lib/dateUtils.js`, `src/lib/id.js`, `src/lib/loyalty.js`,
  `src/lib/menuIndex.js`, `src/lib/reportsAggregate.js`, `src/lib/qr.js`,
  `src/lib/aggregate.js`, `src/components/ErrorBoundary.jsx` (imports `observability.js`),
  `src/components/OfflineBanner.jsx`, `src/components/ui.jsx`, `src/components/Toaster.jsx`
- `src/data/defaults.js`, `src/data/menu.js`
- `supabase/schema.sql` (the only applied SQL contract)

### PRESENT BUT NOT WIRED (code exists, no active runtime path calls it)
- `src/lib/auth.js` — `loginWithEmail`, `logoutUser`, `resolveOrganizationMembership`,
  full `initializeAuthSession(supabaseClient)` branch (no client ever passed)
- `src/lib/serverTransactions.js` — `executeServerPayment/SplitPayment/Refund`, idempotency keys
- `src/lib/observability.js` — imported by ErrorBoundary (active) and
  OperationalMonitoringView (not wired); `logApplicationError` used only by ErrorBoundary;
  security events / diagnostics not invoked in app flow
- `src/lib/incidentEngine.js` — only imported by unreachable `SystemIncidentView.jsx`
- `src/views/BillingView.jsx` + `components/BillingHistory.jsx` (Refund UI unreachable),
  `components/CheckoutPanel.jsx`, `components/InvoicePreview.jsx`
- `src/views/OperationalMonitoringView.jsx`, `src/views/SystemIncidentView.jsx` (no tab)
- `actions.generatePendingBill`, `actions.payPendingBill`, `actions.refundOrder`,
  `actions.createBill`, `actions.updateBillStatus` (only test/sim usage), `actions.clockIn/OutShift`
  (via EmployeesView — actually ShiftManager IS wired in EmployeesView; so shifts are wired)
- `hasPermission`/`ROLE_PERMISSIONS` (multitenant.js) — defined, never called in UI
- `src/lib/deploymentDR.js`, `src/lib/deploymentHealth.js`, `src/lib/productionHealth.js`,
  `src/lib/scalableDataEngine.js`, `src/lib/secretScanner.js` (CI-only script) — not imported by app
- `supabase/multitenant_schema.sql` (tables defined, app writes only the JSON blob),
  `supabase/b10–b16*.sql` (unapplied)

### TEST-ONLY code
- `tests/` (entire tree), `tests/e2e/e2eGuard.js`
- `scratch/` scripts
- `src/lib/bugFixTest.js`, `src/lib/authTest.js`, `src/lib/multitenantTest.js`,
  `src/lib/b02WorkflowTest.js`, `src/lib/shiftSimulation.js`, `src/lib/benchmark.js`
- CI workflows `.github/workflows/*` (test/RC gates)
- `src/performance/profilerCallback.js` (utility; `perf` npm script targets a missing
  `src/performance/measurements.js`)

### DOCUMENTATION ONLY
- `docs/*.md` (B0.2–B2.1 audits, runbooks, CURRENT_REALITY_AUDIT, templates), `docs/*.json`
  (test-result artifacts), `RELEASE_NOTES.md`, `TEST_CHECKLIST.md`, `implementation_plan.md`
- `.env.example`

### UNKNOWN / UNVERIFIED
- Whether `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` values in `.env` point to a live project,
  whether the `cafe_state` row exists there, and whether `upsert_cafe_state` + realtime publication
  are actually deployed (values not inspected; no network call made).
- Whether the relational SQL (multitenant/b10–b16) has been applied to any database.
- Whether any of the `docs/*_TEST_RESULTS.json` / audit claims reflect reality (not executed;
  earlier claims are treated as unverified per instructions).
- Runtime behavior of tests (`tests/e2e/*`) and CI — none executed during this discovery.

---

## CURRENT SYSTEM OF RECORD

Based strictly on the code in the working tree:

1. **Persistence** — The active runtime is a **single-document JSON store**:
   the entire café state is one JSON blob (`state_version` + `updated_at` + `organization_id`
   stamped). It is written to **localStorage (`kado-cafe-state`)** and, when env vars are configured,
   mirrored to the Supabase **`cafe_state`** table keyed by **`cafe_id`** via RPC
   `upsert_cafe_state` with realtime + 90s-poll fallback. All read/write logic lives in
   `src/lib/storage.js`; all mutations live in `src/state/actions.js`.

2. **Authentication** — The active system of record is **local, per-device, PIN-based**:
   employees are stored in `state.employees` (mirrored in `state.users`), the session is a plain
   object in `localStorage["kado-cafe-session"]`, and login is a 4-digit PIN string comparison in
   `LoginScreen.jsx`/`StaffApp.jsx`. **Supabase Auth is not used at runtime**: no supabase client is
   passed to `initializeAuthSession`/`loginWithEmail`, and the Cloud Login form falls back to a
   simulated Owner login. The relational `organization_members`/tenant tables and RLS policies are
   defined in SQL but not exercised by the active app.

3. **Payments** — The active system of record is **client-authoritative**: bills are created and
   marked Paid directly in the state blob by `actions.generateBillForTable` (and loyalty/stock
   effects applied client-side). The server-authoritative RPC path
   (`serverTransactions.js` + `b10_server_transactions.sql`) exists but is **not wired**.

4. **Tenancy** — Organization is a **stamped field** (`organization_id` on the JSON blob and on
   inventory logs) with a module-level current-org variable in `multitenant.js`. No RLS-backed
   partition is enforced for the active `cafe_state` path; the relational multi-tenant schema is
   present-but-unused by the running app.

5. **Order/billing/inventory/table flows** are all pure functions in `src/state/actions.js` applied
   through `StaffApp.update`, persisted via `storage.js:setState`, and kept in sync across devices
   via realtime (when cloud-enabled) or `storage` events (local multi-tab).
