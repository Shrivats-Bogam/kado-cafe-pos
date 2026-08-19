# Incident Postmortem Report Template

**Incident ID**: `INC-YYYYMMDD-001`  
**Date**: YYYY-MM-DD  
**Severity**: `P0 / P1 / P2 / P3`  
**Status**: `RESOLVED / CLOSED`  
**Affected Organization(s)**: `[Organization ID / All]`  
**Lead Incident Owner**: `[Owner Name]`

---

## 1. Executive Summary & Impact

- **Summary Description**: Brief high-level summary of the operational failure.
- **Customer Impact**: Number of affected orders, transactions, or café locations.
- **Duration**: Total time from detection to resolution (RTO).
- **Data Integrity Impact**: Financial discrepancy amount (Must be **₹0**) and Inventory discrepancy amount (Must be **0 kg**).

---

## 2. Timeline of Events

| Time (UTC) | Event Description / Status Change | Correlation ID |
|------------|-----------------------------------|----------------|
| 00:00 | Incident Detected (`PAYMENT_FAILURE_SPIKE`) | `corr_req_...` |
| 00:05 | Investigation Started | `corr_req_...` |
| 00:10 | Mitigated / Fallback Triggered | `corr_req_...` |
| 00:15 | Root Cause Identified & Resolved | `corr_req_...` |

---

## 3. Root Cause Analysis (5 Whys)

1. **Why did the failure occur?**: 
2. **Why did the failure bypass initial checks?**: 
3. **Why was the failure not detected earlier?**: 

---

## 4. Corrective & Preventive Action Items

| Action Item | Severity / Priority | Assignee | Target Date | Status |
|-------------|---------------------|----------|-------------|--------|
| Add RPC retry guard | P1 | Lead Dev | YYYY-MM-DD | OPEN |
| Update alert threshold | P2 | DevOps | YYYY-MM-DD | OPEN |

---

## 5. Final Approval & Verification

- **Financial Reconciled**: YES (Discrepancy: ₹0)
- **Inventory Reconciled**: YES (Discrepancy: 0 kg)
- **Tenant Isolation Preserved**: YES
