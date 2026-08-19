# Operational Runbook: Realtime Channel Outage Handling

## 1. Symptoms & Impact
- WebSocket realtime subscription emits `CHANNEL_ERROR` or `TIMED_OUT`.
- Impact: Low. Multi-device updates do not push instantly via WebSocket, but 90s polling fallback self-heals multi-device state.

## 2. Detection
- Realtime callback receives `CHANNEL_ERROR` or `TIMED_OUT`.

## 3. Immediate Action
- Polling fallback automatically queries `cafe_state` every 90s.

## 4. Recovery
- `subscribeToChanges()` reconnects automatically when WebSocket link recovers.
