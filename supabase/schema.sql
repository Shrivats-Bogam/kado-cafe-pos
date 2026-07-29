-- =====================================================================
-- Kado Cafe — Supabase schema
-- Paste this entire file into Supabase SQL Editor → Run.
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE).
-- =====================================================================

-- 1. Single key/value table holding the entire cafe state as JSON.
--    We keep the full state in one row so the app stays simple — updates
--    are atomic and the client just reads/writes one JSON blob.
create table if not exists cafe_state (
  cafe_id  text primary key,
  data     jsonb not null,
  updated_at timestamptz not null default now()
);

-- Disable Row-Level Security for the MVP — there's no auth user yet,
-- only the anon key (safe enough for a single-cafe owner using their
-- own private project URL + anon key). Re-enable RLS with proper policies
-- before going public / sharing the URL.
alter table cafe_state disable row-level security;

-- 2. Bump updated_at automatically on write
create or replace function touch_cafe_state()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_cafe_state on cafe_state;
create trigger trg_touch_cafe_state
  before update on cafe_state
  for each row execute function touch_cafe_state();

-- 3. Convenience upsert helper used by the app
create or replace function upsert_cafe_state(p_cafe_id text, p_data jsonb)
returns void
language sql
as $$
  insert into cafe_state (cafe_id, data, updated_at)
  values (p_cafe_id, p_data, now())
  on conflict (cafe_id)
  do update set data = excluded.data, updated_at = now();
$$;

-- 4. Optional: seed an empty default row so the app isn't greeted by null
--    on first run. Cafe id "kado-cafe" matches the client default.
do $$
begin
  if not exists (select 1 from cafe_state where cafe_id = 'kado-cafe') then
    insert into cafe_state (cafe_id, data)
    values ('kado-cafe', '{}'::jsonb);
  end if;
end;
$$;

-- 5. Enable Realtime so the client `.on('postgres_changes', ...)` subscription
--    fires within ~200ms of remote writes. Without this, Supabase silently
--    returns no events. Run this once after running the rest of the schema.
alter publication supabase_realtime add table cafe_state;
