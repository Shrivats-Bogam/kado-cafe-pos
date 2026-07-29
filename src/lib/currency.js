// Money + date + order total helpers used everywhere.

export function currency(n) {
  return "\u20B9" + Number(n || 0).toFixed(0);
}

export function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const t = new Date();
  return (
    d.getDate() === t.getDate() &&
    d.getMonth() === t.getMonth() &&
    d.getFullYear() === t.getFullYear()
  );
}

export function isThisMonth(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const t = new Date();
  return d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}

function startOfDay(d) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s;
}

export function isYesterday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const yesterday = startOfDay(new Date());
  yesterday.setDate(yesterday.getDate() - 1);
  const target = startOfDay(d);
  return target.getTime() === yesterday.getTime();
}

export function isThisWeek(iso) {
  if (!iso) return false;
  const d = startOfDay(new Date(iso));
  const today = startOfDay(new Date());
  const day = today.getDay(); // 0 = Sun
  const weekStart = new Date(today);
  // Treat week as Monday-based; shift Sunday back 6 to align with previous Monday
  weekStart.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return d.getTime() >= weekStart.getTime() && d.getTime() <= weekEnd.getTime();
}

export function isLastWeek(iso) {
  if (!iso) return false;
  const d = startOfDay(new Date(iso));
  const today = startOfDay(new Date());
  const day = today.getDay();
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(lastWeekStart);
  lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
  return d.getTime() >= lastWeekStart.getTime() && d.getTime() <= lastWeekEnd.getTime();
}

export function minutesSince(iso) {
  if (!iso) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

/**
 * Compute order totals across a cart.
 * @param {Array<{menuItemId, qty}>} cart
 * @param {Array<{id, price}>} menuItems
 * @param {number} discountPct — 0 to 100
 * @param {boolean} gstOn — apply 5% GST
 */
export function orderTotal(cart = [], menuItems = [], discountPct = 0, gstOn = false) {
  const subtotal = cart.reduce((sum, it) => {
    const mi = menuItems.find((m) => m.id === it.menuItemId);
    return sum + (mi ? mi.price * it.qty : 0);
  }, 0);
  const discount = (subtotal * (discountPct || 0)) / 100;
  const afterDiscount = subtotal - discount;
  const gst = gstOn ? afterDiscount * 0.05 : 0;
  const grandTotal = afterDiscount + gst;
  return { subtotal, discount, gst, grandTotal };
}
