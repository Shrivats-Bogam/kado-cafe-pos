// Lightweight Date utilities for filtering Order History by Time Range

export function startOfDay(d = new Date()) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function startOfWeek(d = new Date()) {
  const date = startOfDay(d);
  const day = date.getDay() || 7; 
  if (day !== 1) date.setHours(-24 * (day - 1)); 
  return date;
}

export function startOfMonth(d = new Date()) {
  const date = startOfDay(d);
  date.setDate(1);
  return date;
}

export function isBetween(dateString, startDate, endDate) {
  if (!dateString) return false;
  const d = new Date(dateString).getTime();
  return d >= startDate.getTime() && d <= endDate.getTime();
}

/**
 * Filter array of objects containing a date field.
 * @param {Array} list - list of orders/data
 * @param {string} dateField - key on the object (e.g. "paidAt" or "createdAt")
 * @param {string} range - "today", "yesterday", "week", "month", "all"
 */
export function filterByDateRange(list, dateField, range) {
  if (range === "all") return list;

  const now = new Date();
  let start, end;

  if (range === "today") {
    start = startOfDay(now);
    end = new Date(start.getTime() + 86400000 - 1);
  } else if (range === "yesterday") {
    start = new Date(startOfDay(now).getTime() - 86400000);
    end = new Date(start.getTime() + 86400000 - 1);
  } else if (range === "week") {
    start = startOfWeek(now);
    end = new Date(start.getTime() + 7 * 86400000 - 1);
  } else if (range === "month") {
    start = startOfMonth(now);
    const nextMonth = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    end = new Date(nextMonth.getTime() - 1);
  } else {
    return list;
  }

  return list.filter((item) => isBetween(item[dateField], start, end));
}

// Format an ISO string to a human readable time (e.g., "10:30 AM")
export function formatTime(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Format an ISO string to a human readable date (e.g., "Oct 12")
export function formatDate(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
}
