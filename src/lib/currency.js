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
