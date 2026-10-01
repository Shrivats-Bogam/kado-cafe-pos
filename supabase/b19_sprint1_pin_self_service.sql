-- =====================================================================
-- Kado Cafe POS — Sprint 1: PIN Self-Service & Admin Lifecycle RPCs
-- =====================================================================
set search_path = public, extensions;

-- 1. Self-service: Any staff member changes their own PIN
create or replace function public.update_my_pin(
  p_cafe_id      text,
  p_employee_id  text,
  p_old_pin      text,
  p_new_pin      text
)
returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare
  r record;
begin
  if p_new_pin !~ '^\d{4,6}$' then
    raise exception 'PIN must be 4 to 6 digits';
  end if;

  select * into r from public.staff_pins
   where cafe_id = p_cafe_id and employee_id = p_employee_id;

  if not found then
    raise exception 'Employee not found';
  end if;

  if r.locked_until is not null and r.locked_until > now() then
    raise exception 'Account is currently locked';
  end if;

  if extensions.crypt(p_old_pin, r.pin_hash) != r.pin_hash then
    raise exception 'Current PIN is incorrect';
  end if;

  update public.staff_pins
     set pin_hash = extensions.crypt(p_new_pin, extensions.gen_salt('bf')),
         failed_count = 0,
         locked_until = null
   where cafe_id = p_cafe_id and employee_id = p_employee_id;

  return true;
end $$;

-- 2. Owner-only: Set/update PIN for employee provisioning
create or replace function public.admin_set_employee_pin(
  p_cafe_id      text,
  p_owner_pin    text,
  p_employee_id  text,
  p_new_pin      text,
  p_role         text default 'Staff'
)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_new_pin !~ '^\d{4,6}$' then
    raise exception 'PIN must be 4 to 6 digits';
  end if;

  -- Caller must be an active, unlocked Owner
  if not exists (
    select 1 from public.staff_pins s
     where s.cafe_id = p_cafe_id
       and s.role = 'Owner'
       and (s.locked_until is null or s.locked_until <= now())
       and extensions.crypt(coalesce(p_owner_pin,''), s.pin_hash) = s.pin_hash
  ) then
    raise exception 'Owner authorization required';
  end if;

  insert into public.staff_pins (cafe_id, employee_id, pin_hash, role, failed_count, locked_until)
  values (
    p_cafe_id,
    p_employee_id,
    extensions.crypt(p_new_pin, extensions.gen_salt('bf')),
    p_role,
    0,
    null
  )
  on conflict (cafe_id, employee_id) do update set
    pin_hash     = excluded.pin_hash,
    role         = excluded.role,
    failed_count = 0,
    locked_until = null;
end $$;

-- 3. Owner-only: Remove employee login access upon deactivation/removal
create or replace function public.admin_remove_employee_pin(
  p_cafe_id      text,
  p_owner_pin    text,
  p_employee_id  text
)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (
    select 1 from public.staff_pins s
     where s.cafe_id = p_cafe_id
       and s.role = 'Owner'
       and (s.locked_until is null or s.locked_until <= now())
       and extensions.crypt(coalesce(p_owner_pin,''), s.pin_hash) = s.pin_hash
  ) then
    raise exception 'Owner authorization required';
  end if;

  delete from public.staff_pins
   where cafe_id = p_cafe_id and employee_id = p_employee_id;
end $$;

-- Expose RPCs to client
grant execute on function public.update_my_pin(text,text,text,text)             to anon, authenticated;
grant execute on function public.admin_set_employee_pin(text,text,text,text,text) to anon, authenticated;
grant execute on function public.admin_remove_employee_pin(text,text,text)     to anon, authenticated;
