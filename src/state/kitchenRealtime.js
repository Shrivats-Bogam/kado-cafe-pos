// Kitchen realtime side-effects.
//
// These helpers — snapshots, status-change diffing, toast dispatch and sound
// synthesis — are extracted verbatim (logic unchanged) from StaffApp.jsx so
// that the staff shell stays a render/state-binding file while these concerns
// live in a module that does not depend on React.
//
// `fireStatusToasts` compares prev/next snapshots, raises toasts through the
// passed-in toaster, and plays WebAudio chimes when `soundEnabled` is true.
// Keeping it pure-ish (depends on functions it's given, plus the audio system)
// keeps it unit-testable separately from the React tree.

import { snapshotStatuses } from "./snapshot.js";

// Compare prev vs next tables/parcels; fire toasts for new or status-changed
// orders + sound for "Ready" / "New Rush" so waiters and kitchen react instantly.
export function fireStatusToasts(prev, next, watched, toaster, soundEnabled) {
  if (!watched) return;
  const prevSnap = snapshotStatuses(prev);
  const nextSnap = snapshotStatuses(next);

  // Tables: new orders and status changes
  next.tables.forEach((t) => {
    if (t.items.length === 0 || t.kitchenStatus === "Served") return;
    const pk = prevSnap[t.id];
    const nk = nextSnap[t.id];
    if (!pk && nk) {
      // Brand-new order appeared
      if (t.priority === "Rush") {
        toaster.push(`🔴 RUSH ORDER — Table ${t.number}`, "rush");
        if (soundEnabled) playSound("rush");
      } else {
        toaster.push(`New order — Table ${t.number}`, "info");
        if (soundEnabled) playSound("new");
      }
    } else if (pk && pk !== nk) {
      // Status changed (New → Cooking → Ready → ...)
      if (nk === "Cooking") toaster.push(`Kitchen started Table ${t.number}`, "info");
      else if (nk === "Ready") {
        toaster.push(`✅ Order Ready — Table ${t.number}`, "success");
        if (soundEnabled) playSound("ready");
      } else if (nk === "Served") {
        // table is being served; we already clear on Served so this rarely fires
      }
    }
  });

  // Tables that became empty (someone completed a bill) — no toast; the bill is its own reward.

  // Parcels
  next.parcels.forEach((p) => {
    const key = `p_${p.id}`;
    const pp = prevSnap[key];
    const np = nextSnap[key];
    if (!pp && np) {
      toaster.push(`New parcel: ${p.customerName || "Walk-in"}`, "info");
      if (soundEnabled) playSound("new");
    } else if (pp && pp !== np && np === "Ready") {
      toaster.push(`✅ Parcel Ready — ${p.customerName || "Walk-in"}`, "success");
      if (soundEnabled) playSound("ready");
    }
  });
}

// Lightweight WebAudio beeps — no audio files, no autoplay restrictions
// because we're triggered by a user-initiated session.
let _audioCtx = null;
export function playSound(kind) {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _audioCtx;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine";
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
    switch (kind) {
      case "new":
        o.frequency.setValueAtTime(660, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
        o.start(now); o.stop(now + 0.25); break;
      case "ready":
        o.frequency.setValueAtTime(880, now);
        o.frequency.setValueAtTime(1320, now + 0.12);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
        o.start(now); o.stop(now + 0.4); break;
      case "rush":
        o.type = "square";
        o.frequency.setValueAtTime(440, now);
        o.frequency.setValueAtTime(220, now + 0.15);
        o.frequency.setValueAtTime(440, now + 0.3);
        o.frequency.setValueAtTime(220, now + 0.45);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
        o.start(now); o.stop(now + 0.6); break;
      default: break;
    }
  } catch (e) { /* audio not allowed yet — silent */ }
}
