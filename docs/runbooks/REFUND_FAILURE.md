# Operational Runbook: Refund Failure Handling

## 1. Symptoms & Impact
- Refund request rejected or unauthorized.
- Status: `REFUND_FAILED` or `UNAUTHORIZED_ROLE`.

## 2. Invariants
- Refunds require `Owner` authorization.
- Duplicate refunds strictly blocked (`duplicateRefunds = 0`).
- Financial reconciliation must satisfy `Gross - Refunds = Net Revenue` (Discrepancy = ₹0).
