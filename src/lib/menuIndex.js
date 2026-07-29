// Menu-item indexing + lookup helpers.
//
// Throughout the app we do `menuItems.find(m => m.id === id)` on every cart
// render, kitchen render, bill render — typically O(items × cart) per render.
// For a 140-item menu and a 20-item cart that's 2,800 finds/sec on each tick.
//
// Replacing these with a pre-built Map turns each lookup to O(1). Construction
// is O(items) once per render (or once per state change, via useMemo), so the
// net win is large on any screen with both a cart and a menu.
//
// `useMenuIndex` memoizes the Map's identity so memoized children don't get
// blown when their parent re-renders with an unchanged menuItems array.

import { useMemo } from "react";

// Light wrapper around a Map accessor that returns `undefined` instead of
// crashing if the index is null (e.g. while menuItems hasn't loaded yet).
export function lookup(index, id) {
  return index ? index.get(id) : undefined;
}

// Build a Map<id, menuItem>. Pure; safe to call outside React.
export function indexById(menuItems) {
  const map = new Map();
  if (!menuItems) return map;
  for (const m of menuItems) map.set(m.id, m);
  return map;
}

// React hook: build the index once and reuse across renders. The returned Map
// identity is stable across renders when menuItems itself is stable, so it can
// be passed as a prop to memoized children without breaking their memo.
export function useMenuIndex(menuItems) {
  return useMemo(() => indexById(menuItems), [menuItems]);
}
