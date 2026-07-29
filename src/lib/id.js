// Stable, collision-resistant client-side id generation.
//
// `Date.now()` alone collides on multi-write-in-same-ms (e.g. mobile double-tap
// or two concurrent tab writes). Combining timestamp + a counter + random
// means the probability of collision is negligible even under bursts, while
// remaining sortable and string-friendly for React keys and persistence.

let _seq = 0;

export function makeId(prefix = "id") {
  // Monotonic within a session; random component guards cross-session/worker.
  _seq = (_seq + 1) % 1_000_000;
  return `${prefix}${Date.now().toString(36)}${_seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
