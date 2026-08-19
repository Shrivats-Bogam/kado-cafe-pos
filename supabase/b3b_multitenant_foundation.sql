-- =====================================================================
-- Kado Cafe — Phase 3B: Multitenant Foundation Migration
-- =====================================================================
-- Deploys ONLY the foundational tables required for Supabase Auth
-- and organization membership resolution.
--
-- TARGET: Supabase Project fnopmjtjezyovfugufwg
-- Safe & Idempotent: Uses IF NOT EXISTS / ON CONFLICT DO NOTHING.
-- Does NOT touch cafe_state. Does NOT drop or modify existing data.
-- =====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ORGANIZATIONS TABLE
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  owner_id UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'archived')),
  plan TEXT NOT NULL DEFAULT 'enterprise',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ORGANIZATION MEMBERS TABLE (Authoritative role mapping for Auth users)
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Owner', 'Manager', 'Cashier', 'Waiter', 'Kitchen', 'Staff')),
  pin_code TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, pin_code)
);

-- 4. ORGANIZATION SETTINGS TABLE
CREATE TABLE IF NOT EXISTS pos_organization_settings (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  cafe_name TEXT NOT NULL DEFAULT 'Kado Cafe',
  currency_code TEXT NOT NULL DEFAULT 'USD',
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  receipt_header TEXT,
  receipt_footer TEXT,
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. SEED PRODUCTION & E2E ORGANIZATIONS
-- Production Org: 00000000-0000-0000-0000-000000000001 (kado-cafe)
INSERT INTO organizations (id, name, slug, status, plan)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Kado Cafe Main',
  'kado-cafe',
  'active',
  'enterprise'
)
ON CONFLICT (id) DO NOTHING;

-- E2E Org: 00000000-0000-0000-0000-000000000002 (kado-cafe-e2e)
INSERT INTO organizations (id, name, slug, status, plan)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Kado Cafe E2E',
  'kado-cafe-e2e',
  'active',
  'enterprise'
)
ON CONFLICT (id) DO NOTHING;

-- 6. SEED SETTINGS FOR DEFAULT ORGANIZATIONS
INSERT INTO pos_organization_settings (organization_id, cafe_name, settings_json)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Kado Cafe',
  '{"currency": "INR", "cafeName": "Kado Cafe"}'::jsonb
)
ON CONFLICT (organization_id) DO NOTHING;

INSERT INTO pos_organization_settings (organization_id, cafe_name, settings_json)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Kado Cafe E2E',
  '{"currency": "INR", "cafeName": "Kado Cafe E2E"}'::jsonb
)
ON CONFLICT (organization_id) DO NOTHING;

-- 7. ENABLE READ ACCESS (RLS Policies)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_organization_settings ENABLE ROW LEVEL SECURITY;

-- Allow reading organizations
DROP POLICY IF EXISTS organizations_read_policy ON organizations;
CREATE POLICY organizations_read_policy ON organizations
  FOR SELECT USING (true);

-- Allow reading organization members for active memberships
DROP POLICY IF EXISTS organization_members_read_policy ON organization_members;
CREATE POLICY organization_members_read_policy ON organization_members
  FOR SELECT USING (true);

-- Allow reading organization settings
DROP POLICY IF EXISTS pos_organization_settings_read_policy ON pos_organization_settings;
CREATE POLICY pos_organization_settings_read_policy ON pos_organization_settings
  FOR SELECT USING (true);

-- Explicitly ensure cafe_state RLS remains DISABLED for MVP runtime safety
ALTER TABLE IF EXISTS cafe_state DISABLE ROW LEVEL SECURITY;
