// Loyalty program + customer birthday helpers.

import { indexById } from "./menuIndex.js";

/**
 * Calculate membership tier based on lifetime spend.
 * Default thresholds: Gold = ₹10,000, Platinum = ₹50,000.
 */
export function calculateMembershipTier(lifetimeSpend = 0, thresholds = { Gold: 10000, Platinum: 50000 }) {
  const goldLimit = thresholds?.Gold || 10000;
  const platLimit = thresholds?.Platinum || 50000;

  if (lifetimeSpend >= platLimit) return "Platinum";
  if (lifetimeSpend >= goldLimit) return "Gold";
  return "Silver";
}

/**
 * Apply loyalty points to the customer list for a paid order.
 * Rule: 1 point earned per ₹X spent (default ₹20 = 1 pt).
 *
 * @param {Array} customers — existing customers list
 * @param {string} phone — phone number (min 6 chars to qualify)
 * @param {number} amountSpent — final amount paid
 * @param {number} pointsToRedeem — points being redeemed this order
 * @param {Object} settings — optional configurable loyalty settings { earnRate, tierThresholds }
 * @returns {{ customers: Array, customerId: string|null }}
 */
export function applyLoyalty(customers = [], phone = "", amountSpent = 0, pointsToRedeem = 0, settings = {}, billRef = "", orderHistory = []) {
  const cleanPhone = String(phone).replace(/\D/g, "").slice(0, 10);
  if (!cleanPhone || cleanPhone.length < 6) {
    return { customers, customerId: null };
  }

  // IDEMPOTENCY GUARD: One bill reference -> Maximum ONE loyalty award
  if (billRef && Array.isArray(orderHistory) && orderHistory.some((o) => o.id === billRef)) {
    const existingCust = customers.find((c) => String(c.phone).replace(/\D/g, "").slice(0, 10) === cleanPhone);
    return { customers, customerId: existingCust ? existingCust.id : null };
  }

  const earnRate = settings.earnRate || 20; // default: 1 point per ₹20 spent
  const thresholds = settings.tierThresholds || { Gold: 10000, Platinum: 50000 };

  const spent = Math.max(0, amountSpent || 0);
  const earned = Math.floor(spent / earnRate);
  const existing = customers.find((c) => String(c.phone).replace(/\D/g, "").slice(0, 10) === cleanPhone);

  if (existing) {
    const newLifetimeSpend = (existing.lifetimeSpend || 0) + spent;
    const updated = {
      ...existing,
      totalOrders: (existing.totalOrders || 0) + 1,
      totalVisits: (existing.totalVisits || existing.totalOrders || 0) + 1,
      lifetimeSpend: newLifetimeSpend,
      membership: calculateMembershipTier(newLifetimeSpend, thresholds),
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
    name: `Customer (${cleanPhone})`,
    phone: cleanPhone,
    birthday: "",
    anniversary: "",
    address: "",
    notes: "",
    totalOrders: 1,
    totalVisits: 1,
    lifetimeSpend: spent,
    membership: calculateMembershipTier(spent, thresholds),
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
  if (isNaN(bday.getTime())) return null;

  const next = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

/**
 * Aggregate the customer's top 5 favorite items across historical orders.
 */
export function topFavoriteItems(customerId, orderHistory = [], menuItems = []) {
  const idx = indexById(menuItems);
  const counts = {};

  orderHistory
    .filter((o) => o.customerId === customerId || (o.phone && o.phone.length >= 6))
    .forEach((o) =>
      (o.items || []).forEach((it) => {
        const mi = idx.get(it.menuItemId);
        const name = mi ? mi.name : (it.name || it.menuItemId);
        counts[name] = (counts[name] || 0) + (it.qty || 1);
      })
    );

  return Object.entries(counts)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);
}
