-- =====================================================================
-- Kado Cafe POS — Sprint B1.0 Server-Authoritative Transactions (S10.1)
-- =====================================================================
-- Relational tables, idempotency keys, financial ledgers, and atomic RPC
-- functions for server-authoritative payments, refunds, and stock deductions.
-- =====================================================================

-- 1. FINANCIAL LEDGER TABLE
CREATE TABLE IF NOT EXISTS pos_financial_ledger (
  id TEXT PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_id TEXT,
  payment_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('SALE', 'PAYMENT', 'REFUND', 'DISCOUNT', 'EXPENSE', 'ADJUSTMENT')),
  amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  created_by TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. REFUNDS TABLE
CREATE TABLE IF NOT EXISTS pos_refunds (
  id TEXT PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  payment_id TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  reason TEXT NOT NULL DEFAULT 'Customer Return',
  created_by TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. IDEMPOTENCY KEYS TABLE
CREATE TABLE IF NOT EXISTS pos_idempotency_keys (
  idempotency_key TEXT PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  target_action TEXT NOT NULL,
  result_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pos_financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_idempotency_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS pos_financial_ledger_tenant_isolation ON pos_financial_ledger;
CREATE POLICY pos_financial_ledger_tenant_isolation ON pos_financial_ledger 
  FOR ALL USING (organization_id = auth.current_organization_id()) 
  WITH CHECK (organization_id = auth.current_organization_id());

DROP POLICY IF EXISTS pos_refunds_tenant_isolation ON pos_refunds;
CREATE POLICY pos_refunds_tenant_isolation ON pos_refunds 
  FOR ALL USING (organization_id = auth.current_organization_id()) 
  WITH CHECK (organization_id = auth.current_organization_id());

DROP POLICY IF EXISTS pos_idempotency_keys_tenant_isolation ON pos_idempotency_keys;
CREATE POLICY pos_idempotency_keys_tenant_isolation ON pos_idempotency_keys 
  FOR ALL USING (organization_id = auth.current_organization_id()) 
  WITH CHECK (organization_id = auth.current_organization_id());

-- =====================================================================
-- 4. SERVER RPC TRANSACTION FUNCTIONS
-- =====================================================================

-- RPC 1: ATOMIC PAYMENT SETTLEMENT TRANSACTION
CREATE OR REPLACE FUNCTION settle_payment_transaction(
  p_organization_id UUID,
  p_order_id TEXT,
  p_payment_method TEXT,
  p_amount NUMERIC,
  p_idempotency_key TEXT,
  p_staff_id TEXT DEFAULT 'system',
  p_staff_role TEXT DEFAULT 'Staff'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_result JSONB;
  v_authoritative_total NUMERIC(10, 2);
  v_already_paid NUMERIC(10, 2);
  v_unpaid_balance NUMERIC(10, 2);
  v_payment_id TEXT;
  v_ledger_id TEXT;
  v_order_record RECORD;
  v_result JSONB;
BEGIN
  -- 1. ROLE PERMISSION CHECK
  IF p_staff_role NOT IN ('Owner', 'Manager', 'Staff', 'Cashier') THEN
    RAISE EXCEPTION 'UNAUTHORIZED_ROLE: Staff role % does not have payment settlement permissions', p_staff_role;
  END IF;

  -- 2. IDEMPOTENCY REPLAY CHECK
  IF p_idempotency_key IS NOT NULL THEN
    SELECT result_json INTO v_existing_result 
    FROM pos_idempotency_keys 
    WHERE idempotency_key = p_idempotency_key AND organization_id = p_organization_id;

    IF v_existing_result IS NOT NULL THEN
      RETURN v_existing_result;
    END IF;
  END IF;

  -- 3. AUTHORITATIVE ORDER LOOKUP & LOCKING
  SELECT * INTO v_order_record 
  FROM pos_orders 
  WHERE id = p_order_id AND organization_id = p_organization_id 
  FOR UPDATE;

  IF v_order_record IS NULL THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: Order % does not exist for this organization', p_order_id;
  END IF;

  IF v_order_record.status = 'Paid' OR v_order_record.status = 'completed' THEN
    RAISE EXCEPTION 'ORDER_ALREADY_PAID: Order % has already been paid', p_order_id;
  END IF;

  v_authoritative_total := v_order_record.grand_total;

  -- Calculate existing paid sum
  SELECT COALESCE(SUM(amount), 0.00) INTO v_already_paid 
  FROM pos_payments 
  WHERE bill_id = p_order_id AND organization_id = p_organization_id AND status = 'completed';

  v_unpaid_balance := v_authoritative_total - v_already_paid;

  -- 4. VALIDATE PAYMENT AMOUNT AGAINST AUTHORITATIVE DB BALANCE
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: Payment amount must be greater than zero';
  END IF;

  IF p_amount > v_unpaid_balance THEN
    RAISE EXCEPTION 'OVERPAYMENT_REJECTED: Payment amount (%) exceeds unpaid balance (%)', p_amount, v_unpaid_balance;
  END IF;

  -- 5. ATOMIC WRITES
  v_payment_id := 'pay_' || p_order_id || '_' || trunc(extract(epoch from now()) * 1000)::text;
  v_ledger_id := 'led_' || p_order_id || '_' || trunc(extract(epoch from now()) * 1000)::text;

  -- Insert Payment Record
  INSERT INTO pos_payments (id, organization_id, bill_id, amount, method, status, created_at)
  VALUES (v_payment_id, p_organization_id, p_order_id, p_amount, p_payment_method, 'completed', NOW());

  -- Insert Financial Ledger Entry
  INSERT INTO pos_financial_ledger (id, organization_id, order_id, payment_id, type, amount, payment_method, created_by, idempotency_key, created_at)
  VALUES (v_ledger_id, p_organization_id, p_order_id, v_payment_id, 'PAYMENT', p_amount, p_payment_method, p_staff_id, p_idempotency_key, NOW());

  -- Update Order Status if Fully Paid
  IF (v_already_paid + p_amount) >= v_authoritative_total THEN
    UPDATE pos_orders 
    SET status = 'Paid', paid_at = NOW() 
    WHERE id = p_order_id AND organization_id = p_organization_id;
  END IF;

  -- Log Audit Event
  INSERT INTO pos_activity_logs (id, organization_id, user_id, action, details, created_at)
  VALUES (
    'act_' || trunc(extract(epoch from now()) * 1000)::text,
    p_organization_id,
    p_staff_id,
    'PAYMENT_COMPLETED',
    jsonb_build_object('order_id', p_order_id, 'amount', p_amount, 'method', p_payment_method, 'payment_id', v_payment_id),
    NOW()
  );

  v_result := jsonb_build_object(
    'success', true,
    'status', 'PAID',
    'payment_id', v_payment_id,
    'order_id', p_order_id,
    'amount', p_amount,
    'authoritative_total', v_authoritative_total,
    'paid_at', NOW()
  );

  -- Store Idempotency Result
  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO pos_idempotency_keys (idempotency_key, organization_id, target_action, result_json, created_at)
    VALUES (p_idempotency_key, p_organization_id, 'PAYMENT', v_result, NOW())
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  -- PL/pgSQL automatically executes ROLLBACK on exception
  RAISE;
END;
$$;


-- RPC 2: ATOMIC SPLIT PAYMENT TRANSACTION
CREATE OR REPLACE FUNCTION settle_split_payment_transaction(
  p_organization_id UUID,
  p_order_id TEXT,
  p_split_payments JSONB,
  p_idempotency_key TEXT,
  p_staff_id TEXT DEFAULT 'system',
  p_staff_role TEXT DEFAULT 'Staff'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_result JSONB;
  v_authoritative_total NUMERIC(10, 2);
  v_order_record RECORD;
  v_split_sum NUMERIC(10, 2) := 0.00;
  v_elem JSONB;
  v_amt NUMERIC(10, 2);
  v_result JSONB;
BEGIN
  IF p_staff_role NOT IN ('Owner', 'Manager', 'Staff', 'Cashier') THEN
    RAISE EXCEPTION 'UNAUTHORIZED_ROLE: Staff role % does not have payment permissions', p_staff_role;
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT result_json INTO v_existing_result 
    FROM pos_idempotency_keys 
    WHERE idempotency_key = p_idempotency_key AND organization_id = p_organization_id;

    IF v_existing_result IS NOT NULL THEN
      RETURN v_existing_result;
    END IF;
  END IF;

  -- Lock Order
  SELECT * INTO v_order_record 
  FROM pos_orders 
  WHERE id = p_order_id AND organization_id = p_organization_id 
  FOR UPDATE;

  IF v_order_record IS NULL THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: Order % does not exist', p_order_id;
  END IF;

  v_authoritative_total := v_order_record.grand_total;

  -- Sum split entries
  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_split_payments) LOOP
    v_amt := (v_elem->>'amount')::NUMERIC;
    IF v_amt <= 0 THEN
      RAISE EXCEPTION 'INVALID_SPLIT_ENTRY: Split payment entries must have amount > 0';
    END IF;
    v_split_sum := v_split_sum + v_amt;
  END LOOP;

  -- Enforce Exact Match to DB Authoritative Total
  IF v_split_sum <> v_authoritative_total THEN
    RAISE EXCEPTION 'SPLIT_AMOUNT_MISMATCH: Split total (%) does not equal authoritative bill total (%)', v_split_sum, v_authoritative_total;
  END IF;

  -- Process entries
  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_split_payments) LOOP
    PERFORM settle_payment_transaction(
      p_organization_id,
      p_order_id,
      (v_elem->>'method')::TEXT,
      (v_elem->>'amount')::NUMERIC,
      p_idempotency_key || '_' || (v_elem->>'method'),
      p_staff_id,
      p_staff_role
    );
  END LOOP;

  v_result := jsonb_build_object(
    'success', true,
    'status', 'PAID_SPLIT',
    'order_id', p_order_id,
    'total', v_authoritative_total,
    'splits_count', jsonb_array_length(p_split_payments)
  );

  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO pos_idempotency_keys (idempotency_key, organization_id, target_action, result_json, created_at)
    VALUES (p_idempotency_key, p_organization_id, 'SPLIT_PAYMENT', v_result, NOW())
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  RETURN v_result;
END;
$$;


-- RPC 3: ATOMIC REFUND TRANSACTION
CREATE OR REPLACE FUNCTION process_refund_transaction(
  p_organization_id UUID,
  p_order_id TEXT,
  p_refund_amount NUMERIC,
  p_reason TEXT DEFAULT 'Customer Return',
  p_idempotency_key TEXT DEFAULT NULL,
  p_staff_id TEXT DEFAULT 'system',
  p_staff_role TEXT DEFAULT 'Manager'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_result JSONB;
  v_order_record RECORD;
  v_paid_total NUMERIC(10, 2);
  v_already_refunded NUMERIC(10, 2);
  v_refundable NUMERIC(10, 2);
  v_refund_id TEXT;
  v_result JSONB;
BEGIN
  -- 1. ROLE PERMISSION CHECK (Owner & Manager Only)
  IF p_staff_role NOT IN ('Owner', 'Manager') THEN
    RAISE EXCEPTION 'UNAUTHORIZED_ROLE: Role % does not have refund authorization permissions', p_staff_role;
  END IF;

  -- 2. IDEMPOTENCY CHECK
  IF p_idempotency_key IS NOT NULL THEN
    SELECT result_json INTO v_existing_result 
    FROM pos_idempotency_keys 
    WHERE idempotency_key = p_idempotency_key AND organization_id = p_organization_id;

    IF v_existing_result IS NOT NULL THEN
      RETURN v_existing_result;
    END IF;
  END IF;

  -- 3. LOCK ORDER & VERIFY ORIGINAL PAYMENT
  SELECT * INTO v_order_record 
  FROM pos_orders 
  WHERE id = p_order_id AND organization_id = p_organization_id 
  FOR UPDATE;

  IF v_order_record IS NULL THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: Order % does not exist', p_order_id;
  END IF;

  SELECT COALESCE(SUM(amount), 0.00) INTO v_paid_total 
  FROM pos_payments 
  WHERE bill_id = p_order_id AND organization_id = p_organization_id AND status = 'completed';

  IF v_paid_total <= 0 THEN
    RAISE EXCEPTION 'UNPAID_ORDER_REFUND_REJECTED: Order % has no completed payments to refund', p_order_id;
  END IF;

  SELECT COALESCE(SUM(amount), 0.00) INTO v_already_refunded 
  FROM pos_refunds 
  WHERE order_id = p_order_id AND organization_id = p_organization_id;

  v_refundable := v_paid_total - v_already_refunded;

  IF v_refundable <= 0 THEN
    RAISE EXCEPTION 'ORDER_ALREADY_REFUNDED: Order % has already been fully refunded', p_order_id;
  END IF;

  IF p_refund_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_REFUND_AMOUNT: Refund amount must be greater than zero';
  END IF;

  IF p_refund_amount > v_refundable THEN
    RAISE EXCEPTION 'OVER_REFUND_REJECTED: Refund amount (%) exceeds refundable total (%)', p_refund_amount, v_refundable;
  END IF;

  -- 4. ATOMIC REFUND WRITES
  v_refund_id := 'ref_' || p_order_id || '_' || trunc(extract(epoch from now()) * 1000)::text;

  INSERT INTO pos_refunds (id, organization_id, order_id, amount, reason, created_by, idempotency_key, created_at)
  VALUES (v_refund_id, p_organization_id, p_order_id, p_refund_amount, p_reason, p_staff_id, p_idempotency_key, NOW());

  INSERT INTO pos_payments (id, organization_id, bill_id, amount, method, status, created_at)
  VALUES ('pay_ref_' || v_refund_id, p_organization_id, p_order_id, -p_refund_amount, 'Refund', 'refunded', NOW());

  INSERT INTO pos_financial_ledger (id, organization_id, order_id, payment_id, type, amount, payment_method, created_by, idempotency_key, created_at)
  VALUES ('led_' || v_refund_id, p_organization_id, p_order_id, 'pay_ref_' || v_refund_id, 'REFUND', -p_refund_amount, 'Refund', p_staff_id, p_idempotency_key, NOW());

  UPDATE pos_orders 
  SET status = 'REFUNDED' 
  WHERE id = p_order_id AND organization_id = p_organization_id;

  -- Log Audit Event
  INSERT INTO pos_activity_logs (id, organization_id, user_id, action, details, created_at)
  VALUES (
    'act_' || trunc(extract(epoch from now()) * 1000)::text,
    p_organization_id,
    p_staff_id,
    'REFUND_CREATED',
    jsonb_build_object('order_id', p_order_id, 'amount', p_refund_amount, 'refund_id', v_refund_id),
    NOW()
  );

  v_result := jsonb_build_object(
    'success', true,
    'status', 'REFUNDED',
    'refund_id', v_refund_id,
    'order_id', p_order_id,
    'amount', p_refund_amount
  );

  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO pos_idempotency_keys (idempotency_key, organization_id, target_action, result_json, created_at)
    VALUES (p_idempotency_key, p_organization_id, 'REFUND', v_result, NOW())
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  RETURN v_result;
END;
$$;
