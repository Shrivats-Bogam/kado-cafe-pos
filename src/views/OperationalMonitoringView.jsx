import React, { useState, useEffect } from "react";
import { runProductionDiagnostics, checkFinancialDiscrepancies, checkDataQuality, getErrorLogsBuffer, getSecurityEventsBuffer } from "../lib/observability.js";

export function OperationalMonitoringView({ state = {} }) {
  const [diagnostics, setDiagnostics] = useState(runProductionDiagnostics());
  const [financials, setFinancials] = useState(checkFinancialDiscrepancies(state));
  const [quality, setQuality] = useState(checkDataQuality(state));

  useEffect(() => {
    setDiagnostics(runProductionDiagnostics());
    setFinancials(checkFinancialDiscrepancies(state));
    setQuality(checkDataQuality(state));
  }, [state]);

  const errors = getErrorLogsBuffer();
  const securityEvents = getSecurityEventsBuffer();

  return (
    <div style={{ padding: "24px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>Operational Monitoring & System Diagnostics</h1>

      {/* Financial Health Alert Header */}
      <div style={{ backgroundColor: financials.reconciled ? "#f0fff4" : "#fff5f5", border: `1px solid ${financials.reconciled ? "#38a169" : "#e53e3e"}`, padding: "16px", borderRadius: "8px", marginBottom: "24px" }}>
        <h3 style={{ margin: 0, color: financials.reconciled ? "#276749" : "#9b2c2c" }}>
          Financial Reconciliation: {financials.reconciled ? "RECONCILED (₹0 Discrepancy)" : `DISCREPANCY DETECTED (₹${financials.discrepancy})`}
        </h3>
        <p style={{ margin: "6px 0 0 0", fontSize: "14px", color: "#4a5568" }}>
          Gross Revenue: ₹{financials.grossRevenue} | Refunds Total: ₹{financials.refundsTotal} | Net Revenue: ₹{financials.netRevenue}
        </p>
      </div>

      {/* System Status Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div style={{ padding: "16px", backgroundColor: "#f7fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <h4 style={{ margin: 0, fontSize: "14px", color: "#718096" }}>Environment</h4>
          <p style={{ margin: "4px 0 0 0", fontSize: "18px", fontWeight: "bold" }}>{diagnostics.environment}</p>
        </div>
        <div style={{ padding: "16px", backgroundColor: "#f7fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <h4 style={{ margin: 0, fontSize: "14px", color: "#718096" }}>Connectivity</h4>
          <p style={{ margin: "4px 0 0 0", fontSize: "18px", fontWeight: "bold", color: diagnostics.online ? "#38a169" : "#e53e3e" }}>
            {diagnostics.online ? "ONLINE" : "OFFLINE"}
          </p>
        </div>
        <div style={{ padding: "16px", backgroundColor: "#f7fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <h4 style={{ margin: 0, fontSize: "14px", color: "#718096" }}>Active Tenant ID</h4>
          <p style={{ margin: "4px 0 0 0", fontSize: "14px", fontWeight: "bold", wordBreak: "break-all" }}>{diagnostics.organization_id}</p>
        </div>
        <div style={{ padding: "16px", backgroundColor: "#f7fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <h4 style={{ margin: 0, fontSize: "14px", color: "#718096" }}>Data Quality Status</h4>
          <p style={{ margin: "4px 0 0 0", fontSize: "18px", fontWeight: "bold", color: quality.anomaliesDetected ? "#d69e2e" : "#38a169" }}>
            {quality.anomaliesDetected ? "Anomalies Flagged" : "CLEAN"}
          </p>
        </div>
      </div>

      {/* Security Event Log */}
      <h3 style={{ fontSize: "18px", marginBottom: "12px" }}>Recent Security & Role Events ({securityEvents.length})</h3>
      <div style={{ backgroundColor: "#2d3748", color: "#fff", padding: "16px", borderRadius: "8px", maxHeight: "200px", overflowY: "auto", fontFamily: "monospace", fontSize: "12px", marginBottom: "24px" }}>
        {securityEvents.length === 0 ? "No security events recorded." : securityEvents.slice(-10).map((sec, idx) => (
          <div key={idx} style={{ marginBottom: "6px" }}>
            [{sec.timestamp}] [{sec.severity}] {sec.type}: {JSON.stringify(sec.details)}
          </div>
        ))}
      </div>

      {/* Application Error Log */}
      <h3 style={{ fontSize: "18px", marginBottom: "12px" }}>Recent Error Logs ({errors.length})</h3>
      <div style={{ backgroundColor: "#2d3748", color: "#fff", padding: "16px", borderRadius: "8px", maxHeight: "200px", overflowY: "auto", fontFamily: "monospace", fontSize: "12px" }}>
        {errors.length === 0 ? "No application errors recorded." : errors.slice(-10).map((err, idx) => (
          <div key={idx} style={{ marginBottom: "6px" }}>
            [{err.timestamp}] [{err.error_code}] [{err.correlation_id}] {err.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default OperationalMonitoringView;
