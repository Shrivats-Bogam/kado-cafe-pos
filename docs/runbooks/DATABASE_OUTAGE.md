# Operational Runbook: Database Outage & Offline Fallback Handling

## 1. Symptoms & Impact
- Supabase cloud database connection drops or returns network error.
- Impact: Moderate/High. App automatically falls back to local storage (`localStorage`) so POS orders and payments continue operating offline.

## 2. Detection
- `scanProductionHealth()` reports `database: OFFLINE_FALLBACK`.
- Network request logs emit `[kado-cafe] Supabase getState error, using local fallback`.

## 3. Immediate Action
1. Ensure POS client devices remain online locally.
2. Store offline payments with status `PENDING_SERVER_CONFIRMATION`.

## 4. Investigation
1. Check Supabase status page and cloud project health.
2. Verify local network connectivity at café premises.

## 5. Recovery
1. When cloud connectivity is restored, `setState()` automatically syncs local queued changes to Supabase via optimistic locking and 3-way domain merger (`mergeStates`).

## 6. Verification
- Verify `getState()` returns remote cloud state and `lastFetched` matches local state.
