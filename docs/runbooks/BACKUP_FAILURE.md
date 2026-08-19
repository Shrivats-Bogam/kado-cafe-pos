# Operational Runbook: Backup Failure Handling

## 1. Symptoms & Impact
- Automated backup job fails or returns checksum validation error (`Checksum mismatch`).
- Impact: High. Active operational state remains functional, but pre-restore snapshot or disaster recovery snapshot is stale.

## 2. Detection
- Diagnostic scanner returns `backups: DEGRADED` or `BACKUP_FAILED` alert.
- Correlation ID logged with fingerprint `ERR_BACKUP_CHECKSUM_MISMATCH`.

## 3. Immediate Action
1. Verify active café state is functional via `getState()`.
2. Do NOT perform state mutation or restore drill while backup is degraded.

## 4. Investigation
1. Check `docs/B2.1_TEST_RESULTS.json` or local snapshot registry (`kado_cafe_snapshots_registry`).
2. Verify local storage space and Supabase connectivity.

## 5. Recovery
1. Re-trigger automated backup payload generation: `buildBackupPayload(state)`.
2. Verify `validateBackupPayload(newBackup)` returns `valid: true`.

## 6. Verification & Escalation
- Confirm snapshot is queryable in snapshot registry.
- Escalate to DevOps if Supabase storage endpoint fails.
