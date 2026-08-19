-- =====================================================================
-- Kado Cafe POS — Sprint B1.2 Observability & Security Audit Schema (S12.1)
-- =====================================================================
-- Database tables for structured error logging and security event tracking.
-- =====================================================================

-- 1. SECURITY EVENTS TABLE
CREATE TABLE IF NOT EXISTS pos_security_events (
  id TEXT PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'HIGH', 'CRITICAL')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ERROR LOGS TABLE
CREATE TABLE IF NOT EXISTS pos_error_logs (
  id TEXT PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  error_code TEXT NOT NULL,
  message TEXT NOT NULL,
  operation TEXT NOT NULL,
  correlation_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pos_security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_error_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS pos_security_events_tenant_isolation ON pos_security_events;
CREATE POLICY pos_security_events_tenant_isolation ON pos_security_events
  FOR ALL USING (organization_id = auth.current_organization_id())
  WITH CHECK (organization_id = auth.current_organization_id());

DROP POLICY IF EXISTS pos_error_logs_tenant_isolation ON pos_error_logs;
CREATE POLICY pos_error_logs_tenant_isolation ON pos_error_logs
  FOR ALL USING (organization_id = auth.current_organization_id())
  WITH CHECK (organization_id = auth.current_organization_id());
