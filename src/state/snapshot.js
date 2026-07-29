// Snapshot helpers for kitchen/order status diffing.
//
// `snapshotStatuses` builds a flat {id -> status} map of orders that are
// currently "in flight" (have items and aren't served, or parcels preparing/ready).
// Used by realtime sync to diff prev vs next and fire toasts on transitions.
//
// Internally the parcel id is namespaced with `p_` so a parcel id `p123` can
// never collide with a table id `t1`.

export function snapshotStatuses(state) {
  const snap = {};
  state.tables.forEach((t) => {
    if (t.items.length > 0 && t.kitchenStatus !== "Served") snap[t.id] = t.kitchenStatus;
  });
  state.parcels.forEach((p) => {
    if (p.status === "Preparing" || p.status === "Ready") snap[`p_${p.id}`] = p.status;
  });
  return snap;
}
