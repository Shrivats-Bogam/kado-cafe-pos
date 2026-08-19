-- =====================================================================
-- Kado Cafe POS — Sprint B1.3 Performance & Scalability Indexes (S13.1)
-- =====================================================================
-- Database indexes and server-side aggregation RPCs for high-scale multi-tenant queries.
-- =====================================================================

-- 1. COMPOSITE PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_pos_orders_org_status ON pos_orders(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_pos_orders_org_created ON pos_orders(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_payments_org_bill ON pos_payments(organization_id, bill_id);
CREATE INDEX IF NOT EXISTS idx_pos_inventory_logs_org_ref ON pos_inventory_logs(organization_id, inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_pos_menu_items_org_cat ON pos_menu_items(organization_id, category_id);
CREATE INDEX IF NOT EXISTS idx_pos_customers_org_phone ON pos_customers(organization_id, phone);
CREATE INDEX IF NOT EXISTS idx_pos_activity_logs_org_created ON pos_activity_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_financial_ledger_org_type ON pos_financial_ledger(organization_id, type);

-- 2. DASHBOARD AGGREGATION RPC
CREATE OR REPLACE FUNCTION aggregate_dashboard_metrics(
  p_organization_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  v_total_paid NUMERIC(10, 2) := 0.00;
  v_paid_count INT := 0;
  v_total_refunded NUMERIC(10, 2) := 0.00;
  v_refund_count INT := 0;
  v_net_revenue NUMERIC(10, 2) := 0.00;
  v_result JSONB;
BEGIN
  -- Sum paid orders
  SELECT COALESCE(SUM(grand_total), 0.00), COUNT(*)
  INTO v_total_paid, v_paid_count
  FROM pos_orders
  WHERE organization_id = p_organization_id AND status = 'Paid';

  -- Sum refunds
  SELECT COALESCE(SUM(amount), 0.00), COUNT(*)
  INTO v_total_refunded, v_refund_count
  FROM pos_refunds
  WHERE organization_id = p_organization_id;

  v_net_revenue := v_total_paid - v_total_refunded;

  v_result := jsonb_build_object(
    'gross_revenue', v_total_paid,
    'paid_orders_count', v_paid_count,
    'refunds_total', v_total_refunded,
    'refunds_count', v_refund_count,
    'net_revenue', v_net_revenue
  );

  RETURN v_result;
END;
$$;
