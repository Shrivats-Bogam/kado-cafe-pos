// Loyalty program + customer birthday helpers.

import { indexById } from "./menuIndex.js";

/**
 * Calculate membership tier based on lifetime spend.
 * Default thresholds: Gold = ₹10,000, Platinum = ₹50,000.
 */
export function calculateMembershipTier(lifetimeSpend = 0, thresholds = {}) {
  const goldLimit = Number(thresholds?.Gold ?? thresholds?.goldThreshold ?? 10000);
  const platLimit = Number(thresholds?.Platinum ?? thresholds?.platinumThreshold ?? 50000);
  const spend = Number(lifetimeSpend) || 0;

  if (spend >= platLimit) return "Platinum";
  if (spend >= goldLimit) return "Gold";
  return "Silver";
}

/**
 * Evaluates customer membership tier based on lifetime spend and current tier thresholds.
 * Promotes or aligns tier accordingly.
 */
export function evaluateCustomerTier(customer, thresholdsOrSettings = {}) {
  if (!customer) return customer;
  const thresholds = thresholdsOrSettings?.tierThresholds || thresholdsOrSettings;
  const targetTier = calculateMembershipTier(customer.lifetimeSpend || 0, thresholds);
  
  return {
    ...customer,
    membership: targetTier,
  };
}

/**
 * Auto-promotes customer tiers across an entire array of customers.
 * Returns the updated customer list and the count of promoted profiles.
 */
export function autoPromoteCustomerTiers(customers = [], thresholdsOrSettings = {}) {
  const tierRanks = { Silver: 1, Gold: 2, Platinum: 3 };
  let promotedCount = 0;

  const updatedCustomers = (customers || []).map((c) => {
    const evaluated = evaluateCustomerTier(c, thresholdsOrSettings);
    const prevRank = tierRanks[c.membership] || 1;
    const newRank = tierRanks[evaluated.membership] || 1;
    if (newRank > prevRank) {
      promotedCount++;
    }
    return evaluated;
  });

  return { customers: updatedCustomers, promotedCount };
}

/**
 * Calculates points expiry metrics for a customer.
 * Default policy: Points expire after 365 days of inactivity since last visit.
 */
export function calculatePointsExpiry(customer, expiryDays = 365, now = new Date()) {
  if (!customer || !customer.points || customer.points <= 0) {
    return { isExpired: false, daysRemaining: null, willExpireAt: null, activePoints: 0 };
  }

  const visitDateStr = customer.lastVisit || customer.createdAt;
  if (!visitDateStr) {
    return { isExpired: false, daysRemaining: null, willExpireAt: null, activePoints: customer.points };
  }

  const lastVisitTime = new Date(visitDateStr).getTime();
  if (isNaN(lastVisitTime)) {
    return { isExpired: false, daysRemaining: null, willExpireAt: null, activePoints: customer.points };
  }

  const daysMs = Math.max(1, Number(expiryDays) || 365) * 86400000;
  const willExpireMs = lastVisitTime + daysMs;
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const diffMs = willExpireMs - nowMs;
  const daysRemaining = Math.ceil(diffMs / 86400000);
  const isExpired = daysRemaining <= 0;

  return {
    isExpired,
    daysRemaining: Math.max(0, daysRemaining),
    willExpireAt: new Date(willExpireMs).toISOString(),
    activePoints: isExpired ? 0 : customer.points,
  };
}

/**
 * Expire loyalty points for inactive customers based on expiry threshold.
 * Zeroes expired points, accumulates into customer.expiredPoints, and updates customer records.
 *
 * @param {Array} customers
 * @param {Object} settings
 * @param {Date|string} now
 * @returns {{ customers: Array, totalExpiredPoints: number, expiredCount: number }}
 */
export function expireInactiveCustomerPoints(customers = [], settings = {}, now = new Date()) {
  const isEnabled = settings.loyaltyPointsExpiryEnabled !== false;
  if (!isEnabled) {
    return { customers, totalExpiredPoints: 0, expiredCount: 0 };
  }

  const expiryDays = Number(settings.loyaltyPointsExpiryDays) || 365;
  const currentTime = now instanceof Date ? now : new Date(now);
  let totalExpiredPoints = 0;
  let expiredCount = 0;

  const nextCustomers = (customers || []).map((c) => {
    if (!c.points || c.points <= 0) return c;

    const expiryInfo = calculatePointsExpiry(c, expiryDays, currentTime);
    if (expiryInfo.isExpired) {
      const lost = c.points;
      totalExpiredPoints += lost;
      expiredCount++;
      return {
        ...c,
        points: 0,
        expiredPoints: (c.expiredPoints || 0) + lost,
        lastPointsExpiredAt: currentTime.toISOString(),
      };
    }
    return c;
  });

  return { customers: nextCustomers, totalExpiredPoints, expiredCount };
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

  const earnRate = settings.loyaltyEarnRate || settings.earnRate || 20; // default: 1 point per ₹20 spent
  const thresholds = settings.tierThresholds || { 
    Gold: settings.goldThreshold || 10000, 
    Platinum: settings.platinumThreshold || 50000 
  };

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
