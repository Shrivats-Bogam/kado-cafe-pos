-- =====================================================================
-- Kado Cafe POS — Sprint 3 & Sprint 4: Delta History Sync & Cloud Activity Ledger
-- =====================================================================
-- Sprint 3: get_order_history_since definer RPC for delta syncing
-- Sprint 4: pos_activity_log table + record_activity + get_activity_log + self-logging verify_staff_pin
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Part 1: Sprint 3 — get_order_history_since RPC
-- ---------------------------------------------------------------------
create or replace function public.get_order_history_since(
  p_cafe_id text,
  p_pin text,
  p_since timestamptz,
  p_limit int default 250
)
returns setof public.pos_orders
language plpgsql security definer set search_path = public, extensions as $$
declare
  pin_ok boolean;
begin
  select exists (
    select 1 from public.staff_pins s
     where s.cafe_id = p_cafe_id
       and (s.locked_until is null or s.locked_until <= now())
       and extensions.crypt(coalesce(p_pin,''), s.pin_hash) = s.pin_hash
  ) into pin_ok;

  if not pin_ok then
    raise exception 'REJECTED: valid staff PIN required';
  end if;

  return query
    select * from public.pos_orders
     where organization_id = p_cafe_id
       and (created_at > p_since or (paid_at is not null and paid_at > p_since))
     order by created_at desc
     limit least(greatest(p_limit, 1), 1000);
end $$;

grant execute on function public.get_order_history_since(text, text, timestamptz, int) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Part 2: Sprint 4 — pos_activity_log table
-- ---------------------------------------------------------------------
create table if not exists public.pos_activity_log (
  id              text primary key,
  cafe_id         text not null,
  employee_name   text not null,
  action          text not null,
  module          text not null default 'System',
  details         text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_pos_activity_cafe_created
  on public.pos_activity_log (cafe_id, created_at desc);

-- RLS: Enable row level security and lockdown direct anon access
alter table public.pos_activity_log enable row level security;

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'pos_activity_log' loop
    execute format('drop policy if exists %I on public.pos_activity_log', pol.policyname);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Part 3: Sprint 4 — record_activity RPC (Definer)
-- ---------------------------------------------------------------------
create or replace function public.record_activity(
  p_cafe_id text,
  p_employee_name text,
  p_action text,
  p_module text default 'System',
  p_details text default null,
  p_id text default null
)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  insert into public.pos_activity_log (
    id, cafe_id, employee_name, action, module, details, created_at
  )
  values (
    coalesce(nullif(p_id, ''), 'log_' || md5(random()::text || clock_timestamp()::text)),
    p_cafe_id,
    coalesce(nullif(p_employee_name, ''), 'System User'),
    p_action,
    coalesce(nullif(p_module, ''), 'System'),
    p_details,
    now()
  )
  on conflict (id) do nothing;
end $$;

grant execute on function public.record_activity(text, text, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Part 4: Sprint 4 — get_activity_log RPC (Owner-gated Definer)
-- ---------------------------------------------------------------------
create or replace function public.get_activity_log(
  p_cafe_id text,
  p_pin text,
  p_module text default null,
  p_employee text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_search text default null,
  p_limit int default 200
)
returns table(
  id text,
  employee_name text,
  action text,
  module text,
  details text,
  created_at timestamptz
)
language plpgsql security definer set search_path = public, extensions as $$
declare
  owner_ok boolean;
begin
  select exists (
    select 1 from public.staff_pins s
     where s.cafe_id = p_cafe_id
       and s.role = 'Owner'
       and (s.locked_until is null or s.locked_until <= now())
       and extensions.crypt(coalesce(p_pin,''), s.pin_hash) = s.pin_hash
  ) into owner_ok;

  if not owner_ok then
    raise exception 'Owner authorization required';
  end if;

  return query
    select
      l.id,
      l.employee_name,
      l.action,
      l.module,
      l.details,
      l.created_at
    from public.pos_activity_log l
   where l.cafe_id = p_cafe_id
     and (p_module is null or p_module = '' or l.module = p_module)
     and (p_employee is null or p_employee = '' or l.employee_name = p_employee)
     and (p_from is null or l.created_at >= p_from)
     and (p_to is null or l.created_at <= p_to)
     and (
       p_search is null or p_search = '' or
       l.action ilike '%' || p_search || '%' or
       coalesce(l.details, '') ilike '%' || p_search || '%' or
       l.employee_name ilike '%' || p_search || '%'
     )
   order by l.created_at desc
   limit least(greatest(p_limit, 1), 1000);
end $$;

grant execute on function public.get_activity_log(text, text, text, text, timestamptz, timestamptz, text, int) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Part 5: Sprint 4 — Self-logging verify_staff_pin
-- ---------------------------------------------------------------------
create or replace function public.verify_staff_pin(p_cafe_id text, p_employee_id text, p_pin text)
returns table(ok boolean, role text, locked boolean)
language plpgsql security definer set search_path = public, extensions as $$
declare
  r record;
  max_attempts constant int := 5;
  lock_minutes constant int := 10;
begin
  select * into r from public.staff_pins
   where cafe_id = p_cafe_id and employee_id = p_employee_id;

  if not found then
    -- Log unrecognized employee ID attempt
    insert into public.pos_activity_log (id, cafe_id, employee_name, action, module, details, created_at)
    values ('log_' || md5(random()::text || clock_timestamp()::text), p_cafe_id, p_employee_id, 'Failed PIN attempt: Unknown employee', 'Auth', null, now());

    return query select false, null::text, false; return;
  end if;

  -- currently locked?
  if r.locked_until is not null and r.locked_until > now() then
    insert into public.pos_activity_log (id, cafe_id, employee_name, action, module, details, created_at)
    values ('log_' || md5(random()::text || clock_timestamp()::text), p_cafe_id, p_employee_id, 'Rejected PIN attempt: Account locked', 'Auth', 'Locked until ' || r.locked_until::text, now());

    return query select false, r.role, true; return;
  end if;

  if extensions.crypt(p_pin, r.pin_hash) = r.pin_hash then
    update public.staff_pins
       set failed_count = 0, locked_until = null
     where cafe_id = p_cafe_id and employee_id = p_employee_id;

    insert into public.pos_activity_log (id, cafe_id, employee_name, action, module, details, created_at)
    values ('log_' || md5(random()::text || clock_timestamp()::text), p_cafe_id, p_employee_id, 'Staff PIN authenticated (' || r.role || ')', 'Auth', null, now());

    return query select true, r.role, false; return;
  else
    if r.failed_count + 1 >= max_attempts then
      update public.staff_pins
         set failed_count = failed_count + 1,
             locked_until = now() + (lock_minutes || ' minutes')::interval
       where cafe_id = p_cafe_id and employee_id = p_employee_id;

      insert into public.pos_activity_log (id, cafe_id, employee_name, action, module, details, created_at)
      values ('log_' || md5(random()::text || clock_timestamp()::text), p_cafe_id, p_employee_id, 'Account locked out after consecutive failed PIN attempts', 'Auth', 'Locked for ' || lock_minutes || ' minutes', now());

      return query select false, r.role, true; return;
    else
      update public.staff_pins
         set failed_count = failed_count + 1,
             locked_until = null
       where cafe_id = p_cafe_id and employee_id = p_employee_id;

      insert into public.pos_activity_log (id, cafe_id, employee_name, action, module, details, created_at)
      values ('log_' || md5(random()::text || clock_timestamp()::text), p_cafe_id, p_employee_id, 'Failed PIN attempt', 'Auth', 'Attempt ' || (r.failed_count + 1) || ' of ' || max_attempts, now());

      return query select false, r.role, false; return;
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Notify PostgREST to reload schema
-- ---------------------------------------------------------------------
notify pgrst, 'reload schema';
