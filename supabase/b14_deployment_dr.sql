-- =====================================================================
-- Kado Cafe POS — Sprint B1.4 Production Deployment & DR Schema (S14.1)
-- =====================================================================
-- Database table for tracking application release deployments and rollbacks.
-- =====================================================================

CREATE TABLE IF NOT EXISTS pos_deployments (
  id TEXT PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  commit_hash TEXT NOT NULL,
  environment TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'ROLLED_BACK')),
  deployed_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pos_deployments ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS pos_deployments_tenant_isolation ON pos_deployments;
CREATE POLICY pos_deployments_tenant_isolation ON pos_deployments
  FOR ALL USING (organization_id = auth.current_organization_id())
  WITH CHECK (organization_id = auth.current_organization_id());
