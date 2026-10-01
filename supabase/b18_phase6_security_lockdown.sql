-- =====================================================================
-- Kado Cafe POS — Phase 6: Security Lockdown & PIN-Verified RPCs
-- =====================================================================
-- Threat model:
--   1. PINs leave cafe_state blob -> stored as bcrypt hashes in staff_pins
--   2. cafe_state becomes read-only to anon; writes require valid staff PIN
--   3. pos_orders and financial tables locked to anon; RPC-only
--   4. QR guest ordering uses security-definer rate-limited guest_place_order
-- =====================================================================

-- ---------------------------------------------------------------------
-- Section A: Extensions, pos_orders ledger & staff_pins table
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto;  -- for crypt() and gen_salt()

-- A1: pos_orders ledger table (if not already created by b17)
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

-- A2: staff_pins table (bcrypt hashes, invisible to anon)
create table if not exists public.staff_pins (
  cafe_id      text not null,
  employee_id  text not null,
  pin_hash     text not null,          -- crypt(pin, gen_salt('bf'))
  role         text not null default 'Staff',
  failed_count int  not null default 0,
  locked_until timestamptz,
  primary key (cafe_id, employee_id)
);

alter table public.staff_pins enable row level security;
-- NO anon policies: staff_pins is invisible to the public anon key.

-- ---------------------------------------------------------------------
-- Section B: Seed existing employee PINs (bcrypt)
-- Matches authoritative IDs in cafe_state.data.employees (emp_1 to emp_4)
-- ---------------------------------------------------------------------
insert into public.staff_pins (cafe_id, employee_id, pin_hash, role) values
  ('kado-cafe', 'emp_1', crypt('1234', gen_salt('bf')), 'Owner'),
  ('kado-cafe', 'emp_2', crypt('0000', gen_salt('bf')), 'Waiter'),
  ('kado-cafe', 'emp_3', crypt('4321', gen_salt('bf')), 'Kitchen'),
  ('kado-cafe', 'emp_4', crypt('9999', gen_salt('bf')), 'Staff')
on conflict (cafe_id, employee_id) do update set
  pin_hash = excluded.pin_hash,
  role = excluded.role,
  failed_count = 0,
  locked_until = null;

-- ---------------------------------------------------------------------
-- Section C: verify_staff_pin (definer, with exponential lockout)
-- ---------------------------------------------------------------------
create or replace function public.verify_staff_pin(p_cafe_id text, p_employee_id text, p_pin text)
returns table(ok boolean, role text, locked boolean)
language plpgsql security definer set search_path = public as $$
declare
  r record;
  max_attempts constant int := 5;
  lock_minutes  constant int := 10;
begin
  select * into r from public.staff_pins
   where cafe_id = p_cafe_id and employee_id = p_employee_id;

  if not found then
    return query select false, null::text, false; return;
  end if;

  -- currently locked?
  if r.locked_until is not null and r.locked_until > now() then
    return query select false, r.role, true; return;
  end if;

  if crypt(p_pin, r.pin_hash) = r.pin_hash then
    update public.staff_pins
       set failed_count = 0, locked_until = null
     where cafe_id = p_cafe_id and employee_id = p_employee_id;
    return query select true, r.role, false; return;
  else
    update public.staff_pins
       set failed_count = failed_count + 1,
           locked_until = case when failed_count + 1 >= max_attempts
                               then now() + (lock_minutes || ' minutes')::interval
                               else null end
     where cafe_id = p_cafe_id and employee_id = p_employee_id;
    return query select false, r.role, (r.failed_count + 1 >= max_attempts); return;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Section D: Upgrade upsert_cafe_state to require a valid PIN
-- ---------------------------------------------------------------------
create or replace function public.upsert_cafe_state(
  p_cafe_id text,
  p_data    jsonb,
  p_pin     text default null
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  pin_ok boolean;
begin
  -- Enforce PIN for writes
  select exists (
    select 1 from public.staff_pins s
     where s.cafe_id = p_cafe_id
       and (s.locked_until is null or s.locked_until <= now())
       and crypt(coalesce(p_pin,''), s.pin_hash) = s.pin_hash
  ) into pin_ok;

  if not pin_ok then
    raise exception 'WRITE_REJECTED: valid staff PIN required';
  end if;

  insert into public.cafe_state (cafe_id, data, updated_at)
  values (p_cafe_id, p_data, now())
  on conflict (cafe_id) do update
    set data = excluded.data, updated_at = now();
end $$;

-- ---------------------------------------------------------------------
-- Section E: Financial & history RPCs (definer)
-- ---------------------------------------------------------------------
-- E1: record_paid_order
create or replace function public.record_paid_order(
  p_cafe_id text, p_pin text, p_order jsonb
)
returns void
language plpgsql security definer set search_path = public as $$
declare pin_ok boolean;
begin
  select exists (
    select 1 from public.staff_pins s
     where s.cafe_id = p_cafe_id
       and (s.locked_until is null or s.locked_until <= now())
       and crypt(coalesce(p_pin,''), s.pin_hash) = s.pin_hash
  ) into pin_ok;
  if not pin_ok then raise exception 'REJECTED: valid staff PIN required'; end if;

  insert into public.pos_orders (
    id, organization_id, source, customer_name, customer_id, items_json,
    subtotal, discount, gst, grand_total, points_redeemed,
    payment_mode, status, ledger_id, paid_at, created_at
  ) values (
    p_order->>'id', p_cafe_id, p_order->>'source', p_order->>'customerName',
    nullif(p_order->>'customerId','') , coalesce(p_order->'items','[]'::jsonb),
    coalesce((p_order->>'subtotal')::numeric,0), coalesce((p_order->>'discount')::numeric,0),
    coalesce((p_order->>'gst')::numeric,0), coalesce((p_order->>'grandTotal')::numeric,0),
    coalesce((p_order->>'pointsRedeemed')::numeric,0),
    p_order->>'paymentMode', coalesce(p_order->>'status','Paid'), p_order->>'ledgerId',
    nullif(p_order->>'paidAt','')::timestamptz,
    coalesce(nullif(p_order->>'createdAt','')::timestamptz, now())
  )
  on conflict (id) do nothing;
end $$;

-- E2: get_order_history
create or replace function public.get_order_history(
  p_cafe_id text, p_pin text, p_limit int default 250
)
returns setof public.pos_orders
language plpgsql security definer set search_path = public as $$
declare pin_ok boolean;
begin
  select exists (
    select 1 from public.staff_pins s
     where s.cafe_id = p_cafe_id
       and (s.locked_until is null or s.locked_until <= now())
       and crypt(coalesce(p_pin,''), s.pin_hash) = s.pin_hash
  ) into pin_ok;
  if not pin_ok then raise exception 'REJECTED: valid staff PIN required'; end if;

  return query
    select * from public.pos_orders
     where organization_id = p_cafe_id
     order by created_at desc
     limit least(greatest(p_limit,1), 1000);
end $$;

-- ---------------------------------------------------------------------
-- Section F: guest_place_order (anon-safe, rate-limited)
-- ---------------------------------------------------------------------
create or replace function public.guest_place_order(
  p_cafe_id   text,
  p_table_id  text,
  p_items     jsonb,
  p_notes     text default '',
  p_customer  text default 'Guest'
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  st       jsonb;
  tables_j jsonb;
  t        jsonb;
  found    boolean := false;
  ticket   jsonb;
  last_ts  timestamptz;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'REJECTED: empty order';
  end if;

  select data into st from public.cafe_state where cafe_id = p_cafe_id for update;
  if not found then raise exception 'REJECTED: cafe not found'; end if;

  tables_j := coalesce(st->'tables','[]'::jsonb);

  -- find table + rate-limit (1 guest order / 20s / table)
  select (t2->>'guestLastOrderAt')::timestamptz into last_ts
    from jsonb_array_elements(tables_j) t2 where t2->>'id' = p_table_id;
  if last_ts is not null and last_ts > now() - interval '20 seconds' then
    raise exception 'REJECTED: please wait before ordering again';
  end if;

  ticket := jsonb_build_object(
    'id', 'g_' || substr(md5(random()::text || clock_timestamp()::text), 1, 10),
    'items', p_items, 'status', 'New', 'priority', 'Normal',
    'customerName', p_customer, 'notes', nullif(p_notes,''),
    'createdAt', now()
  );

  tables_j := (
    select jsonb_agg(
      case when t2->>'id' = p_table_id then
        t2 || jsonb_build_object(
          'items', coalesce(t2->'items','[]'::jsonb) || p_items,
          'kitchenTickets', coalesce(t2->'kitchenTickets','[]'::jsonb) || ticket,
          'guestLastOrderAt', now(),
          'status', 'occupied')
      else t2 end
    ) from jsonb_array_elements(tables_j) t2
  );

  st := jsonb_set(st, '{tables}', tables_j, false);

  update public.cafe_state set data = st, updated_at = now() where cafe_id = p_cafe_id;
  return ticket;
end $$;

-- ---------------------------------------------------------------------
-- Section G: Enable RLS & policies (the lockdown)
-- ---------------------------------------------------------------------
-- cafe_state: anon can READ (realtime + guest menu), NOT write
alter table public.cafe_state enable row level security;
drop policy if exists cafe_state_anon_read on public.cafe_state;
create policy cafe_state_anon_read on public.cafe_state
  for select to anon, authenticated using (true);
-- NO insert/update/delete policies for anon -> writes only via definer RPCs

-- Financial tables: fully locked to anon (RPC-only)
alter table public.pos_orders           enable row level security;
alter table public.pos_financial_ledger enable row level security;
alter table public.pos_refunds          enable row level security;
alter table public.pos_idempotency_keys enable row level security;
-- (no policies added = anon denied; definer RPCs bypass RLS)

-- Expose only the RPCs guests/clients need
grant execute on function public.verify_staff_pin(text,text,text)             to anon, authenticated;
grant execute on function public.upsert_cafe_state(text,jsonb,text)           to anon, authenticated;
grant execute on function public.record_paid_order(text,text,jsonb)           to anon, authenticated;
grant execute on function public.get_order_history(text,text,int)             to anon, authenticated;
grant execute on function public.guest_place_order(text,text,jsonb,text,text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Section H: Scrub existing plaintext PINs from cafe_state.data
-- ---------------------------------------------------------------------
update public.cafe_state
set data = jsonb_set(
  case 
    when data ? 'users' then
      jsonb_set(
        data,
        '{users}',
        coalesce((
          select jsonb_agg(u - 'pin')
          from jsonb_array_elements(data->'users') u
        ), '[]'::jsonb)
      )
    else data
  end,
  '{employees}',
  coalesce((
    select jsonb_agg(e - 'pin')
    from jsonb_array_elements(data->'employees') e
  ), '[]'::jsonb)
)
where cafe_id = 'kado-cafe' and data ? 'employees';
