-- =====================================================================
-- Kado Cafe POS — Sprint B1.1 Multi-Tenant SaaS Hardening & Invitations (S11.1)
-- =====================================================================
-- Database tables, RLS policies, invitation management, and tenant switching
-- validation RPC functions.
-- =====================================================================

-- 1. ORGANIZATION INVITATIONS TABLE
CREATE TABLE IF NOT EXISTS pos_organization_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Owner', 'Manager', 'Cashier', 'Waiter', 'Kitchen', 'Staff')),
  invitation_token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  created_by TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pos_organization_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policy for Invitations
DROP POLICY IF EXISTS pos_invitations_tenant_isolation ON pos_organization_invitations;
CREATE POLICY pos_invitations_tenant_isolation ON pos_organization_invitations
  FOR ALL USING (organization_id = auth.current_organization_id())
  WITH CHECK (organization_id = auth.current_organization_id());

-- =====================================================================
-- 2. PL/pgSQL RPC FUNCTIONS FOR MULTI-TENANT SAAS OPERATIONS
-- =====================================================================

-- RPC 1: ATOMIC ORGANIZATION PROVISIONING TRANSACTION
CREATE OR REPLACE FUNCTION provision_organization_transaction(
  p_name TEXT,
  p_owner_id UUID DEFAULT NULL,
  p_owner_name TEXT DEFAULT 'Cafe Owner',
  p_owner_pin TEXT DEFAULT '1234'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
  v_slug TEXT;
  v_result JSONB;
BEGIN
  v_org_id := uuid_generate_v4();
  v_slug := lower(regexp_replace(p_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || trunc(extract(epoch from now()))::text;

  -- 1. Create Organization Record
  INSERT INTO organizations (id, name, slug, owner_id, status, plan, created_at, updated_at)
  VALUES (v_org_id, p_name, v_slug, p_owner_id, 'active', 'enterprise', NOW(), NOW());

  -- 2. Seed Organization Settings
  INSERT INTO pos_organization_settings (organization_id, cafe_name, currency_code, tax_rate, settings_json, updated_at)
  VALUES (v_org_id, p_name, 'USD', 0.00, jsonb_build_object('cafeName', p_name, 'currency', '₹'), NOW());

  -- 3. Seed Default Owner Member
  INSERT INTO organization_members (id, organization_id, user_id, name, role, pin_code, active, created_at, updated_at)
  VALUES (uuid_generate_v4(), v_org_id, p_owner_id, p_owner_name, 'Owner', p_owner_pin, true, NOW(), NOW());

  v_result := jsonb_build_object(
    'success', true,
    'organization_id', v_org_id,
    'name', p_name,
    'slug', v_slug,
    'status', 'active'
  );

  RETURN v_result;
END;
$$;


-- RPC 2: CREATE SECURE ORGANIZATION INVITATION
CREATE OR REPLACE FUNCTION create_organization_invitation(
  p_organization_id UUID,
  p_email TEXT,
  p_role TEXT,
  p_created_by TEXT DEFAULT 'Owner',
  p_caller_role TEXT DEFAULT 'Owner'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token TEXT;
  v_inv_id UUID;
  v_result JSONB;
BEGIN
  -- 1. Role Permission Check (Owner or Manager Only)
  IF p_caller_role NOT IN ('Owner', 'Manager') THEN
    RAISE EXCEPTION 'UNAUTHORIZED_ROLE: Role % does not have invitation permissions', p_caller_role;
  END IF;

  v_inv_id := uuid_generate_v4();
  -- Cryptographically secure token (64 chars)
  v_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO pos_organization_invitations (id, organization_id, email, role, invitation_token, status, created_by, expires_at, created_at)
  VALUES (v_inv_id, p_organization_id, lower(p_email), p_role, v_token, 'pending', p_created_by, NOW() + INTERVAL '7 days', NOW());

  v_result := jsonb_build_object(
    'success', true,
    'invitation_id', v_inv_id,
    'organization_id', p_organization_id,
    'email', lower(p_email),
    'role', p_role,
    'invitation_token', v_token,
    'status', 'pending'
  );

  RETURN v_result;
END;
$$;


-- RPC 3: ACCEPT ORGANIZATION INVITATION
CREATE OR REPLACE FUNCTION accept_organization_invitation(
  p_invitation_token TEXT,
  p_user_id UUID,
  p_user_name TEXT,
  p_pin_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inv_record RECORD;
  v_result JSONB;
BEGIN
  -- 1. Lookup Invitation Record
  SELECT * INTO v_inv_record 
  FROM pos_organization_invitations 
  WHERE invitation_token = p_invitation_token FOR UPDATE;

  IF v_inv_record IS NULL THEN
    RAISE EXCEPTION 'INVITATION_NOT_FOUND: Invalid or non-existent invitation token';
  END IF;

  IF v_inv_record.status <> 'pending' THEN
    RAISE EXCEPTION 'INVITATION_INVALID_STATUS: Invitation token has status %', v_inv_record.status;
  END IF;

  IF v_inv_record.expires_at < NOW() THEN
    UPDATE pos_organization_invitations SET status = 'expired' WHERE id = v_inv_record.id;
    RAISE EXCEPTION 'INVITATION_EXPIRED: Invitation token has expired';
  END IF;

  -- 2. Create Member Record in Target Organization
  INSERT INTO organization_members (id, organization_id, user_id, name, role, pin_code, active, created_at, updated_at)
  VALUES (uuid_generate_v4(), v_inv_record.organization_id, p_user_id, p_user_name, v_inv_record.role, p_pin_code, true, NOW(), NOW());

  -- 3. Mark Invitation Accepted
  UPDATE pos_organization_invitations 
  SET status = 'accepted' 
  WHERE id = v_inv_record.id;

  v_result := jsonb_build_object(
    'success', true,
    'organization_id', v_inv_record.organization_id,
    'role', v_inv_record.role,
    'status', 'accepted'
  );

  RETURN v_result;
END;
$$;


-- RPC 4: REVOKE ORGANIZATION INVITATION
CREATE OR REPLACE FUNCTION revoke_organization_invitation(
  p_organization_id UUID,
  p_invitation_id UUID,
  p_caller_role TEXT DEFAULT 'Owner'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_caller_role NOT IN ('Owner', 'Manager') THEN
    RAISE EXCEPTION 'UNAUTHORIZED_ROLE: Role % does not have permission to revoke invitations', p_caller_role;
  END IF;

  UPDATE pos_organization_invitations 
  SET status = 'revoked' 
  WHERE id = p_invitation_id AND organization_id = p_organization_id;

  RETURN jsonb_build_object('success', true, 'status', 'revoked');
END;
$$;


-- RPC 5: SWITCH ORGANIZATION CONTEXT VALIDATOR
CREATE OR REPLACE FUNCTION switch_organization_context(
  p_user_id UUID,
  p_target_organization_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member_record RECORD;
BEGIN
  SELECT * INTO v_member_record 
  FROM organization_members 
  WHERE organization_id = p_target_organization_id 
    AND user_id = p_user_id 
    AND active = true 
  LIMIT 1;

  IF v_member_record IS NULL THEN
    RAISE EXCEPTION 'TENANT_ACCESS_DENIED: User does not hold an active membership in target organization %', p_target_organization_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', p_target_organization_id,
    'role', v_member_record.role,
    'name', v_member_record.name
  );
END;
$$;
