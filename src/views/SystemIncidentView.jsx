import React, { useState, useEffect } from "react";
import { evaluateSystemHealth, getIncidentsForTenant } from "../lib/incidentEngine.js";
import { getOrganizationId } from "../lib/multitenant.js";

export function SystemIncidentView() {
  const [health, setHealth] = useState(evaluateSystemHealth());
  const [incidents, setIncidents] = useState(getIncidentsForTenant());

  useEffect(() => {
    setHealth(evaluateSystemHealth());
    setIncidents(getIncidentsForTenant());
  }, []);

  const tenantId = getOrganizationId();

  return (
    <div style={{ padding: "24px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>System Incident & Health Monitor</h1>

      {/* Overall Health Status Indicator */}
      <div style={{
        backgroundColor: health.status === "HEALTHY" ? "#f0fff4" : health.status === "DEGRADED" ? "#fffaf0" : "#fff5f5",
        border: `1px solid ${health.status === "HEALTHY" ? "#38a169" : health.status === "DEGRADED" ? "#dd6b20" : "#e53e3e"}`,
        padding: "20px",
        borderRadius: "8px",
        marginBottom: "24px"
      }}>
        <h2 style={{ margin: 0, color: health.status === "HEALTHY" ? "#276749" : health.status === "DEGRADED" ? "#9c4221" : "#9b2c2c" }}>
          System Health Status: {health.status}
        </h2>
        <p style={{ margin: "8px 0 0 0", fontSize: "14px", color: "#4a5568" }}>
          Active Subsystems: Database [{health.subsystems.database}] | Auth [{health.subsystems.authentication}] | Realtime [{health.subsystems.realtime}] | Financials [{health.subsystems.financials}]
        </p>
      </div>

      {/* Open Incidents & Deduplication Table */}
      <h3 style={{ fontSize: "18px", marginBottom: "12px" }}>Tenant Incidents & Alert Log (Tenant: {tenantId})</h3>
      <div style={{ backgroundColor: "#1a202c", color: "#fff", padding: "16px", borderRadius: "8px", fontFamily: "monospace", fontSize: "12px", maxHeight: "300px", overflowY: "auto" }}>
        {incidents.length === 0 ? "No active incidents reported for this organization." : incidents.map((inc, idx) => (
          <div key={idx} style={{ marginBottom: "10px", paddingBottom: "10px", borderBottom: "1px solid #4a5568" }}>
            <span style={{ color: inc.severity === "P0" ? "#e53e3e" : inc.severity === "P1" ? "#dd6b20" : "#cbd5e0", fontWeight: "bold" }}>
              [{inc.severity}] [{inc.status}]
            </span>{" "}
            {inc.eventType} (ID: {inc.incidentId}) - Count: {inc.duplicateCount} | Corr: {inc.correlationId}
            <div style={{ fontSize: "11px", color: "#a0aec0", marginTop: "2px" }}>
              {JSON.stringify(inc.safeMetadata)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SystemIncidentView;
