-- =====================================================================
-- Kado Cafe POS — Phase 5B: POS Orders Ledger Table
-- =====================================================================
create table if not exists public.pos_orders (
  id              text primary key,
  organization_id text not null,
  source          text,
  customer_name   text,
  customer_id     text,
  items_json      jsonb not null default '[]',
  subtotal        numeric(10,2) default 0,
  discount        numeric(10,2) default 0,
  gst             numeric(10,2) default 0,
  grand_total     numeric(10,2) not null default 0,
  points_redeemed numeric(10,2) default 0,
  payment_mode    text,
  status          text,
  ledger_id       text,
  paid_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists pos_orders_org_created_idx
  on public.pos_orders (organization_id, created_at desc);
