// Lightweight Date utilities for filtering Order History & Data by Time Range

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
 * Supports: "today", "yesterday", "week", "last_week", "month", "last_month", "custom", "all"
 */
export function filterByDateRange(list = [], dateField = "paidAt", range = "all", customStart = null, customEnd = null) {
  if (range === "all") return list;

  const window = getDateRangeWindow(range, customStart, customEnd);
  if (!window) return list;

  return list.filter((item) => {
    const val = item[dateField] || item.createdAt || item.date;
    return isBetween(val, window.start, window.end);
  });
}

/**
 * Get start & end dates for current period and comparison period
 */
export function getDateRangeWindow(range = "all", customStart = null, customEnd = null) {
  const now = new Date();

  if (range === "today") {
    const start = startOfDay(now);
    const end = new Date(start.getTime() + 86400000 - 1);
    const prevStart = new Date(start.getTime() - 86400000);
    const prevEnd = new Date(start.getTime() - 1);
    return { start, end, prevStart, prevEnd, label: "Yesterday" };
  } 
  
  if (range === "yesterday") {
    const start = new Date(startOfDay(now).getTime() - 86400000);
    const end = new Date(start.getTime() + 86400000 - 1);
    const prevStart = new Date(start.getTime() - 86400000);
    const prevEnd = new Date(start.getTime() - 1);
    return { start, end, prevStart, prevEnd, label: "Day Before Yesterday" };
  }

  if (range === "week") {
    const start = startOfWeek(now);
    const end = new Date(start.getTime() + 7 * 86400000 - 1);
    const prevStart = new Date(start.getTime() - 7 * 86400000);
    const prevEnd = new Date(start.getTime() - 1);
    return { start, end, prevStart, prevEnd, label: "Last Week" };
  }

  if (range === "last_week") {
    const thisWeekStart = startOfWeek(now);
    const start = new Date(thisWeekStart.getTime() - 7 * 86400000);
    const end = new Date(thisWeekStart.getTime() - 1);
    const prevStart = new Date(start.getTime() - 7 * 86400000);
    const prevEnd = new Date(start.getTime() - 1);
    return { start, end, prevStart, prevEnd, label: "Week Before Last" };
  }

  if (range === "month") {
    const start = startOfMonth(now);
    const nextMonth = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const end = new Date(nextMonth.getTime() - 1);

    const prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
    const prevEnd = new Date(start.getTime() - 1);
    return { start, end, prevStart, prevEnd, label: "Last Month" };
  }

  if (range === "last_month") {
    const thisMonthStart = startOfMonth(now);
    const start = new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() - 1, 1);
    const end = new Date(thisMonthStart.getTime() - 1);

    const prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
    const prevEnd = new Date(start.getTime() - 1);
    return { start, end, prevStart, prevEnd, label: "Month Before Last" };
  }

  if (range === "custom" && customStart && customEnd) {
    const start = startOfDay(new Date(customStart));
    const end = new Date(startOfDay(new Date(customEnd)).getTime() + 86400000 - 1);
    
    // Ensure start <= end
    if (start.getTime() > end.getTime()) {
      return { start: end, end: start, prevStart: null, prevEnd: null, label: "Previous Period" };
    }

    const duration = end.getTime() - start.getTime() + 1;
    const prevStart = new Date(start.getTime() - duration);
    const prevEnd = new Date(start.getTime() - 1);
    return { start, end, prevStart, prevEnd, label: "Previous Custom Period" };
  }

  return null; // "all" has no date boundaries
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
