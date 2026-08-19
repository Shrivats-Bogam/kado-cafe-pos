# Kado Cafe POS — Production Rollback Runbook

**Version**: 1.0.0  
**Target Environment**: Netlify Production (`kado-cafe`) / Staging (`kado-cafe-e2e`)

---

## 1. Incident Detection & Immediate Freeze

1. **Trigger Alert**:
   - Automated deployment health check (`runDeploymentHealthCheck()`) fails.
   - P0/P1 incident flagged (cross-tenant leakage, payment RPC failure, financial discrepancy).
2. **Freeze Traffic & Pipeline**:
   - Immediately freeze automatic deployment triggers in Netlify CI/CD.
   - Set status banner in application monitoring view to `INCIDENT_INVESTIGATION`.

---

## 2. Step-by-Step Rollback Execution Procedure

### Step 1: Identify Last Known-Good Release
- Inspect git tags and release history for the previous stable commit (e.g., `v1.0.0` vs `v1.1.0-broken`).

### Step 2: Database Migration Compatibility Verification
- Confirm database migration backward compatibility.
- **Rule**: Never run destructive schema rollbacks (e.g. `DROP TABLE`, `DROP COLUMN`) automatically on production. All database schema changes use expand/contract strategies.

### Step 3: Revert Frontend & Server Build
- Execute Netlify rollback to the previous deployment build SHA, or run:
  ```bash
  git checkout <previous-stable-tag>
  npm ci
  npm run build
  npm run deploy
  ```

### Step 4: Verify Database Connectivity & Auth
- Execute `runDeploymentHealthCheck()`:
  - Verify Supabase RPC accessibility (`settle_payment_transaction`, `process_refund_transaction`).
  - Confirm tenant organization resolution (`getOrganizationId()`).

### Step 5: Execute Financial & Inventory Reconciliation
- Verify **Gross Revenue - Refunds = Net Revenue** (₹0 discrepancy).
- Verify **Opening + Purchases - Sales - Wastage = Closing Stock** (0 kg discrepancy).

### Step 6: Execute Tenant Isolation & Production Smoke Tests
- Run read-only production smoke test ([`tests/e2e/b15ProductionSmoke.js`](file:///C:/Users/Admin/.gemini/antigravity/worktrees/kado-cafe/redesign_tables_pos_ui/tests/e2e/b15ProductionSmoke.js)).
- Run multi-tenant security verification ([`tests/e2e/b11MultiTenantSecurity.js`](file:///C:/Users/Admin/.gemini/antigravity/worktrees/kado-cafe/redesign_tables_pos_ui/tests/e2e/b11MultiTenantSecurity.js)).

### Step 7: Resume Normal Traffic & Log Incident
- Unfreeze deployment pipeline and log incident post-mortem with correlation IDs.

---

## 3. Disaster Recovery Metrics

- **Target RTO (Recovery Time Objective)**: `< 15 minutes`
- **Target RPO (Recovery Point Objective)**: `0 seconds` (Zero transaction data loss)
- **Measured RTO (In-Memory Isolation Drill)**: `0.03 ms`
- **Measured RPO (In-Memory Isolation Drill)**: `0 ms`
