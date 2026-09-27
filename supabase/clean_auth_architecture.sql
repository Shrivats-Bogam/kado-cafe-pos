-- =====================================================================
-- KADO CAFE POS: CLEAN AUTHENTICATION & FINANCIAL LEDGER MIGRATION
-- =====================================================================
-- Run this script in: Supabase Dashboard -> SQL Editor -> Run
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE).
-- =====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ORGANIZATIONS TABLE
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  plan TEXT NOT NULL DEFAULT 'enterprise',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Default Production Organization (kado-cafe)
INSERT INTO organizations (id, name, slug, status, plan)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Kado Cafe',
  'kado-cafe',
  'active',
  'enterprise'
)
ON CONFLICT (id) DO UPDATE 
SET name = 'Kado Cafe', slug = 'kado-cafe', status = 'active';

-- 3. ORGANIZATION MEMBERS TABLE
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Owner', 'Manager', 'Cashier', 'Waiter', 'Kitchen', 'Staff')),
  pin_code TEXT NOT NULL DEFAULT '1234',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, pin_code)
);

-- 4. FINANCIAL LEDGER & REFUND TABLES (Append-Only)
CREATE TABLE IF NOT EXISTS pos_financial_ledger (
  id TEXT PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  payment_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('SALE', 'PAYMENT', 'REFUND', 'DISCOUNT', 'EXPENSE', 'ADJUSTMENT')),
  amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  created_by_user_id UUID,
  created_by_name TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pos_refunds (
  id TEXT PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  payment_id TEXT,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL DEFAULT 'Customer Return',
  created_by_user_id UUID,
  created_by_name TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pos_idempotency_keys (
  idempotency_key TEXT PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  target_action TEXT NOT NULL CHECK (target_action IN ('PAYMENT', 'SPLIT_PAYMENT', 'REFUND')),
  result_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CAFE STATE JSON STORAGE
CREATE TABLE IF NOT EXISTS cafe_state (
  cafe_id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cafe_state DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION upsert_cafe_state(p_cafe_id TEXT, p_data JSONB)
RETURNS VOID
LANGUAGE sql
AS $$
  INSERT INTO cafe_state (cafe_id, data, updated_at)
  VALUES (p_cafe_id, p_data, NOW())
  ON CONFLICT (cafe_id)
  DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
$$;

-- 6. ONE-TIME RETROACTIVE LINKING FOR EXISTING AUTH USERS
-- Automatically enrolls all existing users in auth.users into organization_members
INSERT INTO organization_members (id, organization_id, user_id, name, role, pin_code, active)
SELECT 
  uuid_generate_v4(),
  '00000000-0000-0000-0000-000000000001'::uuid,
  u.id,
  COALESCE(NULLIF(split_part(u.email, '@', 1), ''), 'Owner'),
  'Owner',
  '1234',
  true
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM organization_members om WHERE om.user_id = u.id
)
ON CONFLICT (organization_id, pin_code) DO NOTHING;

-- 7. AUTOMATED TRIGGER: ON NEW AUTH USER CREATED
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.organization_members (
    id,
    organization_id,
    user_id,
    name,
    role,
    pin_code,
    active
  )
  VALUES (
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    NEW.id,
    COALESCE(NULLIF(split_part(NEW.email, '@', 1), ''), 'Owner'),
    'Owner',
    '1234',
    true
  )
  ON CONFLICT (organization_id, pin_code) DO NOTHING;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 8. SELF-HEALING MEMBERSHIP RESOLVER (Called by frontend on login)
CREATE OR REPLACE FUNCTION public.get_my_organization_membership()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_member RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHENTICATED');
  END IF;

  -- 1. Try to find existing member record
  SELECT id, organization_id, user_id, name, role, active
  INTO v_member
  FROM organization_members
  WHERE user_id = v_uid AND active = true
  LIMIT 1;

  -- 2. If not found, auto-heal and create Owner record
  IF v_member IS NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
    
    INSERT INTO organization_members (id, organization_id, user_id, name, role, pin_code, active)
    VALUES (
      uuid_generate_v4(),
      '00000000-0000-0000-0000-000000000001'::uuid,
      v_uid,
      COALESCE(NULLIF(split_part(v_email, '@', 1), ''), 'Owner'),
      'Owner',
      '1234',
      true
    )
    ON CONFLICT (organization_id, pin_code) DO UPDATE
    SET user_id = EXCLUDED.user_id, active = true
    RETURNING id, organization_id, user_id, name, role, active INTO v_member;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_member.id,
    'organization_id', v_member.organization_id,
    'user_id', v_member.user_id,
    'name', v_member.name,
    'role', v_member.role,
    'active', v_member.active
  );
END;
$$;

-- 9. SERVER-AUTHORITATIVE PAYMENT RPC
CREATE OR REPLACE FUNCTION public.record_server_payment(
  p_order_id TEXT,
  p_amount NUMERIC,
  p_payment_method TEXT DEFAULT 'Cash',
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_user_id UUID := auth.uid();
  v_member RECORD;
  v_existing_result JSONB;
  v_payment_id TEXT;
  v_ledger_id TEXT;
BEGIN
  -- 1. Authenticate Terminal
  IF v_caller_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: Authentication required to record payments';
  END IF;

  -- 2. Resolve or Auto-heal Member
  SELECT id, organization_id, name, role, active 
  INTO v_member
  FROM organization_members
  WHERE user_id = v_caller_user_id AND active = true
  LIMIT 1;

  IF v_member IS NULL THEN
    -- Auto-heal if caller is valid auth user
    INSERT INTO organization_members (id, organization_id, user_id, name, role, pin_code, active)
    VALUES (
      uuid_generate_v4(),
      '00000000-0000-0000-0000-000000000001'::uuid,
      v_caller_user_id,
      'Owner',
      'Owner',
      '1234',
      true
    )
    ON CONFLICT (organization_id, pin_code) DO UPDATE
    SET user_id = EXCLUDED.user_id, active = true
    RETURNING id, organization_id, name, role, active INTO v_member;
  END IF;

  -- 3. Idempotency Check
  IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
    SELECT result_json INTO v_existing_result
    FROM pos_idempotency_keys
    WHERE idempotency_key = TRIM(p_idempotency_key) AND organization_id = v_member.organization_id;

    IF v_existing_result IS NOT NULL THEN
      RETURN v_existing_result;
    END IF;
  END IF;

  -- 4. Validate Inputs
  IF p_order_id IS NULL OR TRIM(p_order_id) = '' THEN
    RAISE EXCEPTION 'INVALID_ORDER_ID: order_id is required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: Payment amount must be greater than zero';
  END IF;

  -- 5. Atomic Ledger Insert
  v_payment_id := 'pay_' || TRIM(p_order_id) || '_' || trunc(extract(epoch from clock_timestamp()) * 1000)::text;
  v_ledger_id := 'led_' || TRIM(p_order_id) || '_' || trunc(extract(epoch from clock_timestamp()) * 1000)::text;

  INSERT INTO pos_financial_ledger (
    id, organization_id, order_id, payment_id, type, amount,
    payment_method, created_by_user_id, created_by_name, idempotency_key, created_at
  )
  VALUES (
    v_ledger_id,
    v_member.organization_id,
    TRIM(p_order_id),
    v_payment_id,
    'PAYMENT',
    p_amount,
    COALESCE(NULLIF(TRIM(p_payment_method), ''), 'Cash'),
    v_caller_user_id,
    v_member.name,
    NULLIF(TRIM(p_idempotency_key), ''),
    NOW()
  );

  v_existing_result := jsonb_build_object(
    'success', true,
    'status', 'PAID',
    'payment_id', v_payment_id,
    'ledger_id', v_ledger_id,
    'order_id', TRIM(p_order_id),
    'amount', p_amount,
    'payment_method', COALESCE(NULLIF(TRIM(p_payment_method), ''), 'Cash'),
    'organization_id', v_member.organization_id,
    'recorded_by', v_member.name,
    'recorded_at', NOW()
  );

  -- Cache Idempotency Key
  IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
    INSERT INTO pos_idempotency_keys (idempotency_key, organization_id, target_action, result_json, created_at)
    VALUES (TRIM(p_idempotency_key), v_member.organization_id, 'PAYMENT', v_existing_result, NOW())
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  RETURN v_existing_result;
END;
$$;

-- 10. SERVER-AUTHORITATIVE REFUND RPC
CREATE OR REPLACE FUNCTION public.record_server_refund(
  p_order_id TEXT,
  p_refund_amount NUMERIC,
  p_reason TEXT DEFAULT 'Customer Return',
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_user_id UUID := auth.uid();
  v_member RECORD;
  v_existing_result JSONB;
  v_refund_id TEXT;
  v_ledger_id TEXT;
  v_total_paid NUMERIC(10, 2) := 0;
  v_total_refunded NUMERIC(10, 2) := 0;
BEGIN
  -- 1. Authenticate Terminal
  IF v_caller_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: Authentication required to record refunds';
  END IF;

  -- 2. Resolve Member & RBAC (Owner or Manager only)
  SELECT id, organization_id, name, role, active 
  INTO v_member
  FROM organization_members
  WHERE user_id = v_caller_user_id AND active = true
  LIMIT 1;

  IF v_member IS NULL OR v_member.role NOT IN ('Owner', 'Manager') THEN
    RAISE EXCEPTION 'FORBIDDEN: Only Owner or Manager can authorize refunds';
  END IF;

  -- 3. Idempotency Check
  IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
    SELECT result_json INTO v_existing_result
    FROM pos_idempotency_keys
    WHERE idempotency_key = TRIM(p_idempotency_key) AND organization_id = v_member.organization_id;

    IF v_existing_result IS NOT NULL THEN
      RETURN v_existing_result;
    END IF;
  END IF;

  -- 4. Calculate Paid vs Refunded Limits
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM pos_financial_ledger
  WHERE order_id = TRIM(p_order_id) AND organization_id = v_member.organization_id AND type = 'PAYMENT';

  SELECT COALESCE(SUM(amount), 0) INTO v_total_refunded
  FROM pos_refunds
  WHERE order_id = TRIM(p_order_id) AND organization_id = v_member.organization_id;

  IF (v_total_refunded + p_refund_amount) > v_total_paid THEN
    RAISE EXCEPTION 'OVER_REFUND: Cumulative refunds cannot exceed total paid amount';
  END IF;

  -- 5. Record Refund
  v_refund_id := 'ref_' || TRIM(p_order_id) || '_' || trunc(extract(epoch from clock_timestamp()) * 1000)::text;
  v_ledger_id := 'led_ref_' || TRIM(p_order_id) || '_' || trunc(extract(epoch from clock_timestamp()) * 1000)::text;

  INSERT INTO pos_refunds (
    id, organization_id, order_id, amount, reason, created_by_user_id, created_by_name, idempotency_key, created_at
  )
  VALUES (
    v_refund_id, v_member.organization_id, TRIM(p_order_id), p_refund_amount,
    COALESCE(NULLIF(TRIM(p_reason), ''), 'Customer Return'),
    v_caller_user_id, v_member.name, NULLIF(TRIM(p_idempotency_key), ''), NOW()
  );

  INSERT INTO pos_financial_ledger (
    id, organization_id, order_id, payment_id, type, amount, payment_method,
    created_by_user_id, created_by_name, idempotency_key, created_at
  )
  VALUES (
    v_ledger_id, v_member.organization_id, TRIM(p_order_id), v_refund_id, 'REFUND',
    -p_refund_amount, 'Refund', v_caller_user_id, v_member.name,
    NULLIF(TRIM(p_idempotency_key), ''), NOW()
  );

  v_existing_result := jsonb_build_object(
    'success', true,
    'status', 'REFUNDED',
    'refund_id', v_refund_id,
    'ledger_id', v_ledger_id,
    'order_id', TRIM(p_order_id),
    'amount', p_refund_amount,
    'recorded_by', v_member.name,
    'recorded_at', NOW()
  );

  IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
    INSERT INTO pos_idempotency_keys (idempotency_key, organization_id, target_action, result_json, created_at)
    VALUES (TRIM(p_idempotency_key), v_member.organization_id, 'REFUND', v_existing_result, NOW())
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  RETURN v_existing_result;
END;
$$;

-- 11. GRANT PERMISSIONS TO AUTHENTICATED & ANON
GRANT EXECUTE ON FUNCTION public.get_my_organization_membership() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.record_server_payment(TEXT, NUMERIC, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.record_server_refund(TEXT, NUMERIC, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.upsert_cafe_state(TEXT, JSONB) TO authenticated, anon;

-- Ensure read access for membership queries
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organizations_read_all ON organizations;
CREATE POLICY organizations_read_all ON organizations FOR SELECT USING (true);

DROP POLICY IF EXISTS organization_members_read_all ON organization_members;
CREATE POLICY organization_members_read_all ON organization_members FOR SELECT USING (true);
