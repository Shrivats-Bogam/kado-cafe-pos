# Operational Runbook: Security Incident Response

## 1. Scope & Policy
- Cross-tenant access attempt, secret exposure, or brute-force PIN attack.
- Redaction policy: All logs, traces, and artifacts must sanitize PINs, passwords, service_role keys, and PII.

## 2. Immediate Action
1. Disable compromised employee record (`disabled = true`).
2. Invalidate active user session immediately.
3. Run secret scanner: `node src/lib/secretScanner.js`.
