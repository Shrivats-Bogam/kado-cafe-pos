# Operational Runbook: Tenant Suspension & Reactivation

## 1. Lifecycle States
- `ACTIVE`: Normal operations allowed.
- `SUSPENDED`: Operational access and payment processing blocked (`canTenantOperate(tenant) === false`). Data remains intact.
- `REACTIVATED`: Access restored cleanly.
- `ARCHIVED`: Permanent read-only administrative access.

## 2. Invariant
- Data MUST NOT be deleted during tenant suspension.
