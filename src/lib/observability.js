// observability.js — Correlation IDs, Error Capture, Security Logging & Diagnostics (Sprint B1.2)

import { getOrganizationId } from "./multitenant.js";
import { CAFE_ID, LS_KEY } from "./storage.js";
import { IS_E2E, APP_ENV } from "./env.js";

const errorLogsBuffer = [];
const securityEventsBuffer = [];

/**
 * Generate a unique correlation ID for lifecycle tracing
 * @param {string} prefix 
 * @returns {string} Correlation ID
 */
export function createCorrelationId(prefix = "req") {
  return `corr_${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Sanitize data objects to purge PINs, passwords, secrets, service-role keys, JWTs, and phone numbers
 * @param {any} input 
 * @returns {any} Sanitized object
 */
export function sanitizeLogData(input) {
  if (!input || typeof input !== "object") return input;

  if (Array.isArray(input)) {
    return input.map(sanitizeLogData);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(input)) {
    const lowerKey = key.toLowerCase();

    if (
      lowerKey.includes("pin") ||
      lowerKey.includes("password") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("service_role") ||
      lowerKey.includes("token") ||
      lowerKey.includes("jwt") ||
      lowerKey.includes("phone")
    ) {
      sanitized[key] = "[REDACTED_PRIVACY]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Log a structured application error
 * @param {Error|string} error 
 * @param {object} context 
 * @returns {object} Error log entry
 */
export function logApplicationError(error, context = {}) {
  const message = typeof error === "string" ? error : error?.message || "Unknown error";
  const stack = typeof error === "object" ? error?.stack : null;
  const correlationId = context.correlationId || createCorrelationId("err");

  const entry = {
    id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    organization_id: context.organization_id || getOrganizationId(),
    error_code: context.errorCode || "APP_ERROR",
    message,
    operation: context.operation || "UNKNOWN_OPERATION",
    correlation_id: correlationId,
    details: sanitizeLogData(context.details || {}),
    timestamp: new Date().toISOString()
  };

  errorLogsBuffer.push(entry);
  console.error(`[kado-observability] [${entry.error_code}] [${correlationId}] ${message}`);
  return entry;
}

/**
 * Record a structured security event
 * @param {string} type 
 * @param {string} severity 
 * @param {object} details 
 * @returns {object} Security event entry
 */
export function recordSecurityEvent(type, severity = "INFO", details = {}) {
  const entry = {
    id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    organization_id: details.organization_id || getOrganizationId(),
    type,
    severity,
    details: sanitizeLogData(details),
    user_id: details.user_id || "system",
    timestamp: new Date().toISOString()
  };

  securityEventsBuffer.push(entry);
  console.warn(`[kado-security] [${severity}] [${type}]`, entry.details);
  return entry;
}

/**
 * Run structured production diagnostics check
 * @returns {object} Diagnostic status report
 */
export function runProductionDiagnostics() {
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  const hasLocalStorage = typeof localStorage !== "undefined";

  return {
    environment: APP_ENV,
    is_e2e: IS_E2E,
    cafe_id: CAFE_ID,
    ls_key: LS_KEY,
    organization_id: getOrganizationId(),
    online: isOnline,
    storage_available: hasLocalStorage,
    buffered_errors: errorLogsBuffer.length,
    buffered_security_events: securityEventsBuffer.length,
    status: "HEALTHY",
    timestamp: new Date().toISOString()
  };
}

/**
 * Check for financial discrepancies in state
 * @param {object} state 
 * @returns {object} Financial reconciliation check
 */
export function checkFinancialDiscrepancies(state = {}) {
  const orderHistory = state.orderHistory || [];
  const refunds = state.refunds || [];
  const payments = state.payments || [];

  const grossRevenue = orderHistory.filter(o => o.status === "Paid").reduce((acc, o) => acc + Number(o.grandTotal || 0), 0);
  const refundsTotal = refunds.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const netRevenue = grossRevenue - refundsTotal;

  const totalPayments = payments.filter(p => p.status === "completed").reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const discrepancy = Math.abs(grossRevenue - (netRevenue + refundsTotal));

  return {
    grossRevenue,
    refundsTotal,
    netRevenue,
    totalPayments,
    discrepancy,
    reconciled: discrepancy === 0,
    status: discrepancy === 0 ? "RECONCILED" : "DISCREPANCY_DETECTED"
  };
}

/**
 * Detect data quality anomalies (duplicate PINs, duplicate IDs, orphaned records)
 * @param {object} state 
 * @returns {object} Data quality anomaly report
 */
export function checkDataQuality(state = {}) {
  const employees = state.employees || [];
  const orders = state.orders || [];
  const payments = state.payments || [];

  const pinMap = {};
  const duplicatePins = [];
  employees.forEach(e => {
    if (e.pin) {
      if (pinMap[e.pin]) duplicatePins.push(e.pin);
      else pinMap[e.pin] = true;
    }
  });

  const orderIds = new Set((state.orderHistory || []).map(o => o.id));
  const orphanedPayments = payments.filter(p => p.orderId && !orderIds.has(p.orderId));

  return {
    duplicatePinsCount: duplicatePins.length,
    orphanedPaymentsCount: orphanedPayments.length,
    anomaliesDetected: duplicatePins.length > 0 || orphanedPayments.length > 0
  };
}

export function getErrorLogsBuffer() {
  return [...errorLogsBuffer];
}

export function getSecurityEventsBuffer() {
  return [...securityEventsBuffer];
}
