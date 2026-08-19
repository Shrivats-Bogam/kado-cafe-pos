# Operational Runbook: Deployment Rollback Procedure

## 1. Trigger Criteria
- Deployment failure, critical frontend asset corruption, or breaking schema incompatibility.

## 2. Execution Steps
1. Identify last stable release version tag (e.g. `B2.0`).
2. Verify pre-deployment backup snapshot.
3. Re-deploy previous asset bundle from CI build artifacts.
4. Verify schema backward compatibility (`SCHEMA_VERSION = 1`).
