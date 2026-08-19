# Operational Runbook: Payment Failure & Ambiguity Handling

## 1. Symptoms & Impact
- Payment submission interrupted mid-flight by network disconnect.
- Status returned: `PENDING_SERVER_CONFIRMATION`.

## 2. Recovery & Invariant Guarantee
1. On reconnect, `executeServerPayment` looks up server ledger using `idempotencyKey`.
2. Reconciles to exactly 0 or 1 payment record (`duplicatePayments = 0`).
