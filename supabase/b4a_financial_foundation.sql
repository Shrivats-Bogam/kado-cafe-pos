-- =====================================================================
-- Kado Cafe POS — Phase 4A: Server-Authoritative Financial Foundation
-- =====================================================================
-- Hardened, tenant-scoped, server-authoritative financial ledger,
-- refunds, and idempotency engine.
--
-- TARGET: Supabase Project fnopmjtjezyovfugufwg
--
-- SECURITY ARCHITECTURE:
-- 1. Identity & Multi-tenancy: organization_id, role, and staff identity
--    are strictly derived from auth.uid() -> organization_members.
-- 2. Zero Client Forgery: Caller cannot supply arbitrary organization_id
--    or forge Owner/Manager permissions.
-- 3. Append-Only: Financial ledger and refund tables permit SELECT and
--    RPC INSERT only. Direct client UPDATE and DELETE are blocked.
-- 4. Idempotency: Protected by UNIQUE constraints and replay cache.
-- 5. Safe & Idempotent: Uses IF NOT EXISTS / OR REPLACE.
-- 6. Zero cafe_state Impact: cafe_state and existing data are untouched.
-- =====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. FINANCIAL LEDGER TABLE (Immutable / Append-Only)
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

-- 3. REFUNDS TABLE (Immutable / Append-Only)
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

-- 4. IDEMPOTENCY KEYS TABLE (Replay Cache)
CREATE TABLE IF NOT EXISTS pos_idempotency_keys (
  idempotency_key TEXT PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  target_action TEXT NOT NULL CHECK (target_action IN ('PAYMENT', 'SPLIT_PAYMENT', 'REFUND')),
  result_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. INDEXES FOR HIGH-PERFORMANCE RECONCILIATION
CREATE INDEX IF NOT EXISTS idx_pos_financial_ledger_order 
  ON pos_financial_ledger (organization_id, order_id);

CREATE INDEX IF NOT EXISTS idx_pos_financial_ledger_created 
  ON pos_financial_ledger (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pos_refunds_order 
  ON pos_refunds (organization_id, order_id);

CREATE INDEX IF NOT EXISTS idx_pos_idempotency_org 
  ON pos_idempotency_keys (organization_id, created_at DESC);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE pos_financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Helper Function for RLS: Get Caller Organization ID
CREATE OR REPLACE FUNCTION get_auth_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT organization_id 
  FROM organization_members 
  WHERE user_id = auth.uid() AND active = true 
  LIMIT 1;
$$;

-- RLS: pos_financial_ledger
DROP POLICY IF EXISTS pos_financial_ledger_select ON pos_financial_ledger;
CREATE POLICY pos_financial_ledger_select ON pos_financial_ledger
  FOR SELECT TO authenticated
  USING (organization_id = get_auth_organization_id());

-- RLS: pos_refunds
DROP POLICY IF EXISTS pos_refunds_select ON pos_refunds;
CREATE POLICY pos_refunds_select ON pos_refunds
  FOR SELECT TO authenticated
  USING (organization_id = get_auth_organization_id());

-- RLS: pos_idempotency_keys
DROP POLICY IF EXISTS pos_idempotency_keys_select ON pos_idempotency_keys;
CREATE POLICY pos_idempotency_keys_select ON pos_idempotency_keys
  FOR SELECT TO authenticated
  USING (organization_id = get_auth_organization_id());

-- NOTE: Direct client UPDATE and DELETE policies are intentionally OMITTED.
-- All table modifications are append-only via server-authoritative RPCs.

-- =====================================================================
-- 7. SERVER-AUTHORITATIVE RPC TRANSACTION FUNCTIONS
-- =====================================================================

-- RPC 1: ATOMIC PAYMENT SETTLEMENT
CREATE OR REPLACE FUNCTION record_server_payment(
  p_order_id TEXT,
  p_amount NUMERIC,
  p_payment_method TEXT DEFAULT 'Cash',
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_user_id UUID;
  v_caller_member RECORD;
  v_existing_result JSONB;
  v_payment_id TEXT;
  v_ledger_id TEXT;
  v_result JSONB;
BEGIN
  -- 1. AUTHENTICATE CALLER
  v_caller_user_id := auth.uid();
  IF v_caller_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: Authentication required to record payments';
  END IF;

  -- 2. RESOLVE CALLER MEMBERSHIP & ROLE (Server-Enforced Multi-Tenancy)
  SELECT id, organization_id, name, role, active 
  INTO v_caller_member
  FROM organization_members
  WHERE user_id = v_caller_user_id AND active = true
  LIMIT 1;

  IF v_caller_member IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: No active organization membership found for caller';
  END IF;

  IF v_caller_member.role NOT IN ('Owner', 'Manager', 'Staff', 'Cashier', 'Waiter') THEN
    RAISE EXCEPTION 'UNAUTHORIZED_ROLE: Role % does not have payment recording permissions', v_caller_member.role;
  END IF;

  -- 3. IDEMPOTENCY REPLAY CHECK
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT result_json INTO v_existing_result
    FROM pos_idempotency_keys
    WHERE idempotency_key = p_idempotency_key AND organization_id = v_caller_member.organization_id;

    IF v_existing_result IS NOT NULL THEN
      RETURN v_existing_result;
    END IF;
  END IF;

  -- 4. VALIDATE INPUTS
  IF p_order_id IS NULL OR TRIM(p_order_id) = '' THEN
    RAISE EXCEPTION 'INVALID_ORDER_ID: order_id is required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: Payment amount must be greater than zero';
  END IF;

  -- 5. ATOMIC WRITES
  v_payment_id := 'pay_' || p_order_id || '_' || trunc(extract(epoch from clock_timestamp()) * 1000)::text;
  v_ledger_id := 'led_' || p_order_id || '_' || trunc(extract(epoch from clock_timestamp()) * 1000)::text;

  INSERT INTO pos_financial_ledger (
    id,
    organization_id,
    order_id,
    payment_id,
    type,
    amount,
    payment_method,
    created_by_user_id,
    created_by_name,
    idempotency_key,
    created_at
  )
  VALUES (
    v_ledger_id,
    v_caller_member.organization_id,
    TRIM(p_order_id),
    v_payment_id,
    'PAYMENT',
    p_amount,
    COALESCE(NULLIF(TRIM(p_payment_method), ''), 'Cash'),
    v_caller_user_id,
    v_caller_member.name,
    NULLIF(TRIM(p_idempotency_key), ''),
    NOW()
  );

  v_result := jsonb_build_object(
    'success', true,
    'status', 'PAID',
    'payment_id', v_payment_id,
    'ledger_id', v_ledger_id,
    'order_id', TRIM(p_order_id),
    'amount', p_amount,
    'payment_method', COALESCE(NULLIF(TRIM(p_payment_method), ''), 'Cash'),
    'organization_id', v_caller_member.organization_id,
    'recorded_by', v_caller_member.name,
    'recorded_at', NOW()
  );

  -- 6. STORE IDEMPOTENCY RESULT
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO pos_idempotency_keys (
      idempotency_key,
      organization_id,
      target_action,
      result_json,
      created_at
    )
    VALUES (
      TRIM(p_idempotency_key),
      v_caller_member.organization_id,
      'PAYMENT',
      v_result,
      NOW()
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  RETURN v_result;
END;
$$;


-- RPC 2: ATOMIC REFUND TRANSACTION (Owner & Manager Only)
CREATE OR REPLACE FUNCTION record_server_refund(
  p_order_id TEXT,
  p_refund_amount NUMERIC,
  p_reason TEXT DEFAULT 'Customer Return',
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_user_id UUID;
  v_caller_member RECORD;
  v_existing_result JSONB;
  v_paid_total NUMERIC(10, 2);
  v_already_refunded NUMERIC(10, 2);
  v_refundable NUMERIC(10, 2);
  v_refund_id TEXT;
  v_ledger_id TEXT;
  v_result JSONB;
BEGIN
  -- 1. AUTHENTICATE CALLER
  v_caller_user_id := auth.uid();
  IF v_caller_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: Authentication required to process refunds';
  END IF;

  -- 2. RESOLVE CALLER MEMBERSHIP & STRICT ROLE (Owner / Manager Only)
  SELECT id, organization_id, name, role, active 
  INTO v_caller_member
  FROM organization_members
  WHERE user_id = v_caller_user_id AND active = true
  LIMIT 1;

  IF v_caller_member IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: No active organization membership found for caller';
  END IF;

  IF v_caller_member.role NOT IN ('Owner', 'Manager') THEN
    RAISE EXCEPTION 'UNAUTHORIZED_ROLE: Role % does not have refund permissions. Only Owner and Manager can issue refunds.', v_caller_member.role;
  END IF;

  -- 3. IDEMPOTENCY REPLAY CHECK
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT result_json INTO v_existing_result
    FROM pos_idempotency_keys
    WHERE idempotency_key = p_idempotency_key AND organization_id = v_caller_member.organization_id;

    IF v_existing_result IS NOT NULL THEN
      RETURN v_existing_result;
    END IF;
  END IF;

  -- 4. VALIDATE INPUTS
  IF p_order_id IS NULL OR TRIM(p_order_id) = '' THEN
    RAISE EXCEPTION 'INVALID_ORDER_ID: order_id is required';
  END IF;

  IF p_refund_amount IS NULL OR p_refund_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_REFUND_AMOUNT: Refund amount must be greater than zero';
  END IF;

  -- 5. VALIDATE OVER-REFUND LIMITS AGAINST FINANCIAL LEDGER
  SELECT COALESCE(SUM(amount), 0.00) INTO v_paid_total
  FROM pos_financial_ledger
  WHERE order_id = TRIM(p_order_id) 
    AND organization_id = v_caller_member.organization_id 
    AND type = 'PAYMENT';

  SELECT COALESCE(SUM(amount), 0.00) INTO v_already_refunded
  FROM pos_refunds
  WHERE order_id = TRIM(p_order_id) 
    AND organization_id = v_caller_member.organization_id;

  -- If payments exist in ledger, enforce hard over-refund check
  IF v_paid_total > 0 THEN
    v_refundable := v_paid_total - v_already_refunded;
    IF v_refundable <= 0 THEN
      RAISE EXCEPTION 'ORDER_ALREADY_REFUNDED: Order % has already been fully refunded (Paid: %, Refunded: %)', TRIM(p_order_id), v_paid_total, v_already_refunded;
    END IF;

    IF p_refund_amount > v_refundable THEN
      RAISE EXCEPTION 'OVER_REFUND_REJECTED: Refund amount (%) exceeds remaining refundable balance (%)', p_refund_amount, v_refundable;
    END IF;
  END IF;

  -- 6. ATOMIC REFUND WRITES
  v_refund_id := 'ref_' || p_order_id || '_' || trunc(extract(epoch from clock_timestamp()) * 1000)::text;
  v_ledger_id := 'led_ref_' || p_order_id || '_' || trunc(extract(epoch from clock_timestamp()) * 1000)::text;

  -- Record into pos_refunds
  INSERT INTO pos_refunds (
    id,
    organization_id,
    order_id,
    payment_id,
    amount,
    reason,
    created_by_user_id,
    created_by_name,
    idempotency_key,
    created_at
  )
  VALUES (
    v_refund_id,
    v_caller_member.organization_id,
    TRIM(p_order_id),
    NULL,
    p_refund_amount,
    COALESCE(NULLIF(TRIM(p_reason), ''), 'Customer Return'),
    v_caller_user_id,
    v_caller_member.name,
    NULLIF(TRIM(p_idempotency_key), ''),
    NOW()
  );

  -- Record negative entry into pos_financial_ledger
  INSERT INTO pos_financial_ledger (
    id,
    organization_id,
    order_id,
    payment_id,
    type,
    amount,
    payment_method,
    created_by_user_id,
    created_by_name,
    idempotency_key,
    created_at
  )
  VALUES (
    v_ledger_id,
    v_caller_member.organization_id,
    TRIM(p_order_id),
    v_refund_id,
    'REFUND',
    -p_refund_amount,
    'Refund',
    v_caller_user_id,
    v_caller_member.name,
    NULLIF(TRIM(p_idempotency_key), ''),
    NOW()
  );

  v_result := jsonb_build_object(
    'success', true,
    'status', 'REFUNDED',
    'refund_id', v_refund_id,
    'ledger_id', v_ledger_id,
    'order_id', TRIM(p_order_id),
    'amount', p_refund_amount,
    'reason', COALESCE(NULLIF(TRIM(p_reason), ''), 'Customer Return'),
    'organization_id', v_caller_member.organization_id,
    'processed_by', v_caller_member.name,
    'recorded_at', NOW()
  );

  -- 7. STORE IDEMPOTENCY RESULT
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    INSERT INTO pos_idempotency_keys (
      idempotency_key,
      organization_id,
      target_action,
      result_json,
      created_at
    )
    VALUES (
      TRIM(p_idempotency_key),
      v_caller_member.organization_id,
      'REFUND',
      v_result,
      NOW()
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  RETURN v_result;
END;
$$;
