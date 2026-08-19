-- =====================================================================
-- Kado Cafe POS — Sprint B1.6 Production Incidents Schema (S16.1)
-- =====================================================================
-- Database table for tracking structured operational incidents and alert deduplication.
-- =====================================================================

CREATE TABLE IF NOT EXISTS pos_incidents (
  id TEXT PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  correlation_id TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('P0', 'P1', 'P2', 'P3')),
  category TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('DETECTED', 'INVESTIGATING', 'MITIGATED', 'RESOLVED', 'CLOSED')),
  fingerprint TEXT NOT NULL,
  safe_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pos_incidents ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS pos_incidents_tenant_isolation ON pos_incidents;
CREATE POLICY pos_incidents_tenant_isolation ON pos_incidents
  FOR ALL USING (organization_id = auth.current_organization_id())
  WITH CHECK (organization_id = auth.current_organization_id());

-- Composite Index for Deduplication & Tenant Queries
CREATE INDEX IF NOT EXISTS idx_pos_incidents_tenant_fp ON pos_incidents(organization_id, fingerprint, status);
