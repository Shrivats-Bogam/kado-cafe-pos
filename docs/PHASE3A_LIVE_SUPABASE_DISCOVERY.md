# Phase 3A: Live Supabase Database Discovery Report

> **READ-ONLY VERIFICATION**  
> Performed on: 2026-08-17  
> Workspace: `c:\Users\Admin\Desktop\New folder\kado-cafe-pos-working-copy`  
> Git Branch: `bugfix-stabilization-v1` — HEAD `75445c5`

---

## 1. Configured Project Identity

| Parameter | Value / Status | Label |
|---|---|---|
| Supabase URL | `https://fnopmjtjezyovfugufwg.supabase.co` | **VERIFIED** |
| Supabase Project Reference | `fnopmjtjezyovfugufwg` | **VERIFIED** |
| Client Auth Config | `persistSession: false, autoRefreshToken: false` | **VERIFIED** |
| Secret Masking | `VITE_SUPABASE_ANON_KEY` present locally, git-ignored, unexposed | **VERIFIED** |

---

## 2. Remote Tables Discovery

| Table Name | Schema | Status in Live Database | Label |
|---|---|---|---|
| `cafe_state` | `public` | Table **EXISTS** (2 rows: `kado-cafe`, `kado-cafe-e2e`) | **VERIFIED** |
| `organizations` | `public` | Table **NOT FOUND** (`PGRST205: Could not find table`) | **NOT FOUND** |
| `organization_members` | `public` | Table **NOT FOUND** (`PGRST205: Could not find table`) | **NOT FOUND** |
| `pos_organization_settings` | `public` | Table **NOT FOUND** (`PGRST205: Could not find table`) | **NOT FOUND** |
| `pos_tables` | `public` | Table **NOT FOUND** (`PGRST205`) | **NOT FOUND** |
| `pos_orders` | `public` | Table **NOT FOUND** (`PGRST205`) | **NOT FOUND** |
| `pos_order_items` | `public` | Table **NOT FOUND** (`PGRST205`) | **NOT FOUND** |
| `pos_bills` | `public` | Table **NOT FOUND** (`PGRST205`) | **NOT FOUND** |
| `pos_payments` | `public` | Table **NOT FOUND** (`PGRST205`) | **NOT FOUND** |
| `pos_kitchen_tickets` | `public` | Table **NOT FOUND** (`PGRST205`) | **NOT FOUND** |

---

## 3. Row-Level Security (RLS) Status

| Table Name | RLS Status | Details | Label |
|---|---|---|---|
| `cafe_state` | **DISABLED** | Explicitly disabled in `schema.sql:20` (`ALTER TABLE cafe_state DISABLE ROW LEVEL SECURITY;`). Anonymous client can read/write data via anon key. | **VERIFIED** |
| `organizations` | **N/A** | Table does not exist in live DB. | **NOT FOUND** |
| `organization_members` | **N/A** | Table does not exist in live DB. | **NOT FOUND** |
| `pos_organization_settings` | **N/A** | Table does not exist in live DB. | **NOT FOUND** |

---

## 4. Realtime Configuration Status

| Feature / Publication | Details | Label |
|---|---|---|
| `cafe_state` Realtime | Configured in `schema.sql:47` (`alter publication supabase_realtime add table cafe_state`). Client subscribes via `cafe_state_changes`. | **VERIFIED** |
| Multi-tenant Table Realtime | Not configured (relational tables do not exist in live DB). | **NOT FOUND** |

---

## 5. RPC & Stored Functions Status

| RPC / Function | Signature | Details | Label |
|---|---|---|---|
| `upsert_cafe_state` | `(p_cafe_id TEXT, p_data JSONB)` | **EXISTS** in live database. Called by `src/lib/storage.js:307`. | **VERIFIED** |
| `migrate_cafe_state_to_multitenant` | `()` | Defined in SQL file `multitenant_schema.sql`, not deployed to live database. | **NOT FOUND** |

---

## 6. Production Organization Status

| Requirement | Discovery Finding | Label |
|---|---|---|
| Relational `organizations` Row (`id = "kado-cafe"`) | Table `organizations` does not exist in the live database. | **NOT FOUND** |
| Document `cafe_state` Row (`cafe_id = "kado-cafe"`) | Row **EXISTS** in `cafe_state`. `updated_at`: `2026-08-13T04:36:46.148602+00:00`, `state_version`: `8`. Internal JSON contains `organization_id: "00000000-0000-0000-0000-000000000001"`. | **VERIFIED** |

---

## 7. E2E Organization Status

| Requirement | Discovery Finding | Label |
|---|---|---|
| Relational `organizations` Row (`id = "kado-cafe-e2e"`) | Table `organizations` does not exist in the live database. | **NOT FOUND** |
| Document `cafe_state` Row (`cafe_id = "kado-cafe-e2e"`) | Row **EXISTS** in `cafe_state`. `updated_at`: `2026-08-12T05:50:10.280683+00:00`. | **VERIFIED** |

---

## 8. Organization Membership Status

| Requirement | Discovery Finding | Label |
|---|---|---|
| Relational `organization_members` Table | Table does not exist in live DB. No relational user membership records exist in Supabase. | **NOT FOUND** |
| Production Owner Membership (`Alex Morgan`) | Exists as an employee object inside `cafe_state` JSON blob (`id: "emp_1"`, `role: "Owner"`, `pin: "1234"`). No Supabase Auth user linkage. | **VERIFIED (Document)** / **NOT FOUND (Relational)** |
| Production Team Members | 4 employees in `cafe_state` JSON: Alex Morgan (Owner), Sarah Jenkins (Manager), David Kim (Kitchen), Emily Watson (Waiter). | **VERIFIED** |

---

## 9. Production State Status & Domain Counts

| Domain Entity | Storage Location | Count in `kado-cafe` State Row | Label |
|---|---|---|---|
| Employees | `cafe_state.data.employees` | 4 | **VERIFIED** |
| Tables / Floor Plan | `cafe_state.data.tables` | 17 | **VERIFIED** |
| Menu Items | `cafe_state.data.menuItems` | 138 | **VERIFIED** |
| Active Orders | `cafe_state.data.orders` | 0 | **VERIFIED** |
| Order History | `cafe_state.data.orderHistory` | 10 | **VERIFIED** |
| Inventory Items | `cafe_state.data.inventory` | 12 | **VERIFIED** |

---

## 10. E2E Isolation Status

| Safety Rail | Finding | Label |
|---|---|---|
| Database Partitioning | `kado-cafe` and `kado-cafe-e2e` share the same Supabase database project, isolated strictly by `cafe_id` column primary key in `cafe_state`. | **VERIFIED** |
| App Runtime Guard | `src/lib/storage.js:36-38` hard-aborts if `IS_E2E && CAFE_ID === "kado-cafe"`. | **VERIFIED** |
| Write Protection Guard | `src/lib/storage.js:254-271` rejects writes with E2E test account markers targeting production `kado-cafe`. | **VERIFIED** |

---

## 11. Inaccessible / Unverified Items

| Item | Status / Reason | Label |
|---|---|---|
| Supabase Auth Users Table (`auth.users`) | Inaccessible via anon API key (restricted to service role / Supabase Auth API). | **UNVERIFIED** |
| PostgreSQL WAL / Storage Internal Settings | Inaccessible via REST API. | **UNVERIFIED** |

---

## 12. Required Database Migrations

| Required Migration File | Purpose | Action Required | Label |
|---|---|---|---|
| `supabase/multitenant_schema.sql` | Creates `organizations`, `organization_members`, `pos_organization_settings`, `pos_*` tables, and RLS policies. | Needs deployment if multi-tenant relational Auth is to be backed by live database tables. | **REQUIRES ACTION** |
| `supabase/schema.sql` | Applied baseline (`cafe_state` + `upsert_cafe_state`). | None (already deployed and active). | **VERIFIED** |

---

## 13. Required Manual Supabase Dashboard Actions

| Action | Purpose | Label |
|---|---|---|
| Apply `multitenant_schema.sql` | Execute migration script in Supabase SQL Editor if relational Auth / RLS is required. | **REQUIRES ACTION** |
| Create Auth Users / Seed `organization_members` | Link Supabase Auth user IDs (`auth.users`) to `organization_members` rows with explicit roles (`Owner`, `Manager`, `Staff`, `Kitchen`). | **REQUIRES ACTION** |
| Enable RLS on `cafe_state` | Restrict `cafe_state` direct anon writes once multi-tenant RLS is ready. | **REQUIRES ACTION** |

---

### Summary Matrix

* **Document Store Architecture (`cafe_state`)**: **VERIFIED & ACTIVE**
* **Relational Multi-Tenant Tables (`organization_members`, `organizations`)**: **NOT FOUND IN LIVE DB**
* **Supabase RPC (`upsert_cafe_state`)**: **VERIFIED & ACTIVE**
* **RLS Protection**: **DISABLED ON LIVE DB (MVP MODE)**
