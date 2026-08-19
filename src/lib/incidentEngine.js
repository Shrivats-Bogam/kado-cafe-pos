// incidentEngine.js — Standardized Incident Model, Alert Deduplication & Health Evaluator (Sprint B1.6)

import { getOrganizationId } from "./multitenant.js";
import { createCorrelationId, sanitizeLogData } from "./observability.js";
import { CAFE_ID } from "./storage.js";
import { IS_E2E, APP_ENV } from "./env.js";

const incidentsBuffer = [];
const fingerprintMap = new Map();

/**
 * Generate alert deduplication fingerprint (5-minute bucket window)
 * @param {string} orgId 
 * @param {string} eventType 
 * @param {string} resourceId 
 * @returns {string} Fingerprint string
 */
export function generateFingerprint(orgId, eventType, resourceId = "global") {
  const timeBucket = Math.floor(Date.now() / 300000); // 5-minute bucket
  return `fp_${orgId}_${eventType}_${resourceId}_${timeBucket}`;
}

/**
 * Create or deduplicate an operational incident record
 * @param {object} params 
 * @returns {object} Incident record
 */
export function recordIncident(params = {}) {
  const orgId = params.organizationId || getOrganizationId();
  const eventType = params.eventType || "UNKNOWN_INCIDENT";
  const resourceId = params.resourceId || "system";
  const fingerprint = generateFingerprint(orgId, eventType, resourceId);

  // Check if active incident with matching fingerprint already exists in buffer
  if (fingerprintMap.has(fingerprint)) {
    const existing = fingerprintMap.get(fingerprint);
    existing.duplicateCount = (existing.duplicateCount || 1) + 1;
    existing.updatedAt = new Date().toISOString();
    return existing;
  }

  const incident = {
    incidentId: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    correlationId: params.correlationId || createCorrelationId("inc"),
    organizationId: orgId,
    severity: params.severity || "P2", // P0, P1, P2, P3
    category: params.category || "SYSTEM",
    eventType,
    status: "DETECTED", // DETECTED, INVESTIGATING, MITIGATED, RESOLVED, CLOSED
    fingerprint,
    duplicateCount: 1,
    releaseVersion: "1.0.0",
    environment: APP_ENV,
    cafe_id: CAFE_ID,
    safeMetadata: sanitizeLogData(params.safeMetadata || {}),
    timestamp: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  incidentsBuffer.push(incident);
  fingerprintMap.set(fingerprint, incident);
  console.warn(`[kado-incident] [${incident.severity}] [${incident.status}] ${incident.eventType} (ID: ${incident.incidentId})`);
  return incident;
}

/**
 * Update incident status (e.g. DETECTED -> RESOLVED)
 * @param {string} incidentId 
 * @param {string} status 
 * @returns {object|null} Updated incident
 */
export function updateIncidentStatus(incidentId, status) {
  const incident = incidentsBuffer.find(i => i.incidentId === incidentId);
  if (incident) {
    incident.status = status;
    incident.updatedAt = new Date().toISOString();
  }
  return incident || null;
}

/**
 * Evaluate system health status across subsystems
 * @param {object} subsystems 
 * @returns {object} System health evaluation report
 */
export function evaluateSystemHealth(subsystems = {}) {
  const dbOk = subsystems.database !== false;
  const authOk = subsystems.auth !== false;
  const realtimeOk = subsystems.realtime !== false;
  const finOk = subsystems.financialReconciliation !== false;

  let healthStatus = "HEALTHY";
  if (!dbOk || !authOk || !finOk) {
    healthStatus = "CRITICAL";
  } else if (!realtimeOk || subsystems.degraded === true) {
    healthStatus = "DEGRADED";
  }

  return {
    status: healthStatus,
    subsystems: {
      database: dbOk ? "UP" : "DOWN",
      authentication: authOk ? "UP" : "DOWN",
      realtime: realtimeOk ? "UP" : "DOWN",
      financials: finOk ? "RECONCILED" : "DISCREPANCY"
    },
    openIncidents: incidentsBuffer.filter(i => i.status !== "RESOLVED" && i.status !== "CLOSED").length,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get tenant-isolated incident logs
 * @param {string} tenantId 
 * @returns {Array} Incidents belonging strictly to tenantId
 */
export function getIncidentsForTenant(tenantId = getOrganizationId()) {
  return incidentsBuffer.filter(i => i.organizationId === tenantId);
}

/**
 * Reconstruct lifecycle events via correlation ID
 * @param {string} correlationId 
 * @param {Array} events 
 * @returns {Array} Trace sequence
 */
export function reconstructLifecycle(correlationId, events = []) {
  return events.filter(e => e.correlationId === correlationId || e.correlation_id === correlationId);
}
