-- =====================================================================
-- Kado Cafe — Multi-Tenant Architecture & Data Isolation Schema (S7.1)
-- =====================================================================
-- Supports multi-tenant café operations with complete database-level 
-- tenant data isolation via Row Level Security (RLS).
-- =====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CORE TENANT & USER TABLES

-- Organizations (Cafés)
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

-- Organization Members / Employees
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

-- Organization Settings
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

-- 3. DOMAIN RELATIONAL TABLES (All bound to organization_id)

-- Tables & Floor Plan
CREATE TABLE IF NOT EXISTS pos_tables (
  id TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  section TEXT NOT NULL DEFAULT 'main',
  capacity INT NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'available',
  current_order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, id)
);

-- Orders
CREATE TABLE IF NOT EXISTS pos_orders (
  id TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  table_id TEXT,
  source TEXT NOT NULL DEFAULT 'Dine-In',
  status TEXT NOT NULL DEFAULT 'active',
  customer_name TEXT,
  customer_id TEXT,
  staff_id TEXT,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  tax NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  grand_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  PRIMARY KEY (organization_id, id)
);

-- Order Items
CREATE TABLE IF NOT EXISTS pos_order_items (
  id TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  menu_item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  quantity INT NOT NULL DEFAULT 1,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, id)
);

-- Bills & Invoices
CREATE TABLE IF NOT EXISTS pos_bills (
  id TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  bill_number TEXT NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL,
  tax NUMERIC(10, 2) NOT NULL,
  discount NUMERIC(10, 2) NOT NULL,
  grand_total NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid',
  payment_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, id)
);

-- Payments
CREATE TABLE IF NOT EXISTS pos_payments (
  id TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bill_id TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  reference_no TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, id)
);

-- Kitchen Tickets
CREATE TABLE IF NOT EXISTS pos_kitchen_tickets (
  id TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  table_name TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, id)
);

-- Menu Categories
CREATE TABLE IF NOT EXISTS pos_categories (
  id TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INT DEFAULT 0,
  PRIMARY KEY (organization_id, id)
);

-- Menu Items
CREATE TABLE IF NOT EXISTS pos_menu_items (
  id TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, id)
);

-- Inventory Items
CREATE TABLE IF NOT EXISTS pos_inventory_items (
  id TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  unit TEXT NOT NULL DEFAULT 'unit',
  current_stock NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
  min_stock NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
  cost_per_unit NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, id)
);

-- Recipes (BOM)
CREATE TABLE IF NOT EXISTS pos_recipes (
  id TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  menu_item_id TEXT NOT NULL,
  inventory_item_id TEXT NOT NULL,
  quantity_required NUMERIC(10, 3) NOT NULL,
  PRIMARY KEY (organization_id, id)
);

-- Inventory Audit Logs
CREATE TABLE IF NOT EXISTS pos_inventory_logs (
  id TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  inventory_item_id TEXT NOT NULL,
  change_amount NUMERIC(10, 3) NOT NULL,
  reason TEXT NOT NULL,
  staff_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, id)
);

-- Customers
CREATE TABLE IF NOT EXISTS pos_customers (
  id TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  loyalty_points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, id)
);

-- Customer Loyalty Transactions
CREATE TABLE IF NOT EXISTS pos_loyalty_transactions (
  id TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  points_change INT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'adjustment')),
  order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, id)
);

-- Parcel / Takeaway Orders
CREATE TABLE IF NOT EXISTS pos_parcel_orders (
  id TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  grand_total NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, id)
);

-- Activity & Audit Logs
CREATE TABLE IF NOT EXISTS pos_activity_logs (
  id TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, id)
);

-- Backups & Snapshots
CREATE TABLE IF NOT EXISTS pos_backups (
  id TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  backup_name TEXT NOT NULL,
  data_blob JSONB NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, id)
);

-- 4. ROW LEVEL SECURITY (RLS) HELPER & POLICIES

-- Helper to extract current active organization from JWT auth metadata
CREATE OR REPLACE FUNCTION auth.current_organization_id()
RETURNS UUID AS $$
BEGIN
  RETURN COALESCE(
    (NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'organization_id', ''))::UUID,
    (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND active = TRUE LIMIT 1),
    '00000000-0000-0000-0000-000000000001'::UUID -- Default single-cafe fallback org
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Enable RLS across all multi-tenant tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_kitchen_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_parcel_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_backups ENABLE ROW LEVEL SECURITY;

-- Macro / Pattern RLS Policies for Tenant Isolation
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN UNNEST(ARRAY[
    'pos_tables', 'pos_orders', 'pos_order_items', 'pos_bills', 
    'pos_payments', 'pos_kitchen_tickets', 'pos_categories', 
    'pos_menu_items', 'pos_inventory_items', 'pos_recipes', 
    'pos_inventory_logs', 'pos_customers', 'pos_loyalty_transactions', 
    'pos_parcel_orders', 'pos_activity_logs', 'pos_backups', 'pos_organization_settings'
  ]) LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS %I ON %I;
      CREATE POLICY %I ON %I FOR ALL USING (organization_id = auth.current_organization_id()) WITH CHECK (organization_id = auth.current_organization_id());
    ', tbl || '_tenant_isolation', tbl, tbl || '_tenant_isolation', tbl);
  END LOOP;
END;
$$;

-- 5. DEFAULT TENANT SEEDING & MIGRATION FUNCTION

-- Seed Default Organization if not present
INSERT INTO organizations (id, name, slug, status, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Kado Cafe Main', 'kado-main', 'active', 'enterprise')
ON CONFLICT (id) DO NOTHING;

-- Migration function to extract single-tenant JSON blob into relational multi-tenant schema
CREATE OR REPLACE FUNCTION migrate_cafe_state_to_multitenant(p_target_org_id UUID DEFAULT '00000000-0000-0000-0000-000000000001')
RETURNS VOID AS $$
DECLARE
  v_state JSONB;
  rec RECORD;
BEGIN
  SELECT data INTO v_state FROM cafe_state WHERE cafe_id = 'kado-cafe' LIMIT 1;
  IF v_state IS NULL THEN
    RETURN;
  END IF;

  -- Migrate Settings
  INSERT INTO pos_organization_settings (organization_id, cafe_name, settings_json)
  VALUES (p_target_org_id, COALESCE(v_state->'settings'->>'cafeName', 'Kado Cafe'), v_state->'settings')
  ON CONFLICT (organization_id) DO UPDATE SET settings_json = EXCLUDED.settings_json;

  -- Migrate Employees/Users
  IF v_state ? 'users' THEN
    FOR rec IN SELECT * FROM jsonb_to_recordset(v_state->'users') AS x(id text, name text, role text, pin text) LOOP
      INSERT INTO organization_members (organization_id, name, role, pin_code)
      VALUES (p_target_org_id, rec.name, rec.role, rec.pin)
      ON CONFLICT (organization_id, pin_code) DO NOTHING;
    END LOOP;
  END IF;

  -- Migrate Menu Categories
  IF v_state ? 'categories' THEN
    FOR rec IN SELECT * FROM jsonb_to_recordset(v_state->'categories') AS x(id text, name text, icon text) LOOP
      INSERT INTO pos_categories (organization_id, id, name, icon)
      VALUES (p_target_org_id, rec.id, rec.name, rec.icon)
      ON CONFLICT (organization_id, id) DO NOTHING;
    END LOOP;
  END IF;

  -- Migrate Menu Items
  IF v_state ? 'menu' THEN
    FOR rec IN SELECT * FROM jsonb_to_recordset(v_state->'menu') AS x(id text, name text, price numeric, category text, available boolean) LOOP
      INSERT INTO pos_menu_items (organization_id, id, name, price, category_id, available)
      VALUES (p_target_org_id, rec.id, rec.name, rec.price, rec.category, COALESCE(rec.available, true))
      ON CONFLICT (organization_id, id) DO NOTHING;
    END LOOP;
  END IF;

  -- Migrate Inventory Items
  IF v_state ? 'inventory' THEN
    FOR rec IN SELECT * FROM jsonb_to_recordset(v_state->'inventory') AS x(id text, name text, stock numeric, minStock numeric, unit text, cost numeric) LOOP
      INSERT INTO pos_inventory_items (organization_id, id, name, current_stock, min_stock, unit, cost_per_unit)
      VALUES (p_target_org_id, rec.id, rec.name, COALESCE(rec.stock, 0), COALESCE(rec.minStock, 0), COALESCE(rec.unit, 'unit'), COALESCE(rec.cost, 0))
      ON CONFLICT (organization_id, id) DO NOTHING;
    END LOOP;
  END IF;

  -- Migrate Customers
  IF v_state ? 'customers' THEN
    FOR rec IN SELECT * FROM jsonb_to_recordset(v_state->'customers') AS x(id text, name text, phone text, email text, points int) LOOP
      INSERT INTO pos_customers (organization_id, id, name, phone, email, loyalty_points)
      VALUES (p_target_org_id, rec.id, rec.name, rec.phone, rec.email, COALESCE(rec.points, 0))
      ON CONFLICT (organization_id, id) DO NOTHING;
    END LOOP;
  END IF;

END;
$$ LANGUAGE plpgsql;
