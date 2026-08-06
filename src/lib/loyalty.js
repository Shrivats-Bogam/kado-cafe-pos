// Loyalty program + customer birthday helpers.

import { indexById } from "./menuIndex.js";

/**
 * Apply loyalty points to the customer list for a paid order.
 * Rule: 1 point earned per ₹20 spent; redeem any number of points (1 point = ₹1).
 * If customer with that phone doesn't exist, create them (name = phone).
 *
 * @param {Array} customers — existing customers list
 * @param {string} phone — phone number (min 6 chars to qualify)
 * @param {number} amountSpent — final amount paid (after discount, before points redemption)
 * @param {number} pointsToRedeem — points being redeemed this order
 * @returns {{ customers: Array, customerId: string|null }}
 */
export function calculateMembershipTier(lifetimeSpend = 0) {
  if (lifetimeSpend >= 50000) return "Platinum";
  if (lifetimeSpend >= 10000) return "Gold";
  return "Silver";
}

export function applyLoyalty(customers, phone, amountSpent, pointsToRedeem = 0) {
  if (!phone || phone.length < 6) {
    return { customers, customerId: null };
  }

  const spent = Math.max(0, amountSpent || 0);
  const earned = Math.floor(spent / 20); // 1 point per ₹20 spent
  const existing = customers.find((c) => c.phone === phone);

  if (existing) {
    const newLifetimeSpend = (existing.lifetimeSpend || 0) + spent;
    const updated = {
      ...existing,
      totalOrders: (existing.totalOrders || 0) + 1,
      totalVisits: (existing.totalVisits || existing.totalOrders || 0) + 1,
      lifetimeSpend: newLifetimeSpend,
      membership: calculateMembershipTier(newLifetimeSpend),
      points: Math.max(0, (existing.points || 0) - (pointsToRedeem || 0)) + earned,
      lastVisit: new Date().toISOString(),
    };
    return {
      customers: customers.map((c) => (c.id === existing.id ? updated : c)),
      customerId: existing.id,
    };
  }

  const created = {
    id: "c" + Date.now(),
    name: phone,
    phone,
    birthday: "",
    anniversary: "",
    address: "",
    notes: "",
    totalOrders: 1,
    totalVisits: 1,
    lifetimeSpend: spent,
    membership: calculateMembershipTier(spent),
    points: earned,
    lastVisit: new Date().toISOString(),
  };
  return { customers: [...customers, created], customerId: created.id };
}

/**
 * Days until the customer's next birthday, or null if no birthday set.
 * Returns 0 if birthday is today.
 */
export function daysUntilBirthday(birthday) {
  if (!birthday) return null;
  const today = new Date();
  const bday = new Date(birthday);
  const next = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

/**
 * Aggregate the customer's most-ordered item across the order history.
 */
export function favoriteItem(customerId, orderHistory, menuItems) {
  const idx = indexById(menuItems);
  const counts = {};
  orderHistory
    .filter((o) => o.customerId === customerId)
    .forEach((o) =>
      (o.items || []).forEach((it) => {
        const mi = idx.get(it.menuItemId);
        const name = mi ? mi.name : it.menuItemId;
        counts[name] = (counts[name] || 0) + it.qty;
      })
    );
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0];
}
