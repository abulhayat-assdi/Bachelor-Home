-- ============================================================
-- DEFAULT HOUSE RENT — seed by member name (not email)
-- ------------------------------------------------------------
-- Idempotent. Safe to run even if 0003 was already applied.
-- Sets per-member default_rent on both profiles and
-- member_directory by matching full_name (case-insensitive).
-- Also back-fills any existing member_month rows that have
-- no house_rent override yet.
-- ============================================================

-- Ensure the column exists (in case 0003 has not been run yet).
alter table public.profiles
  add column if not exists default_rent numeric(10,2) not null default 1667;
alter table public.member_directory
  add column if not exists default_rent numeric(10,2) not null default 1667;

-- Set higher rent for room-owners.
update public.profiles set default_rent = 2500
  where lower(trim(full_name)) in ('abul hayat', 'javed omar', 'jabed omor');
update public.member_directory set default_rent = 2500
  where lower(trim(full_name)) in ('abul hayat', 'javed omar', 'jabed omor');

-- Standard rent for the rest (explicit, in case column defaulted to 0).
update public.profiles set default_rent = 1667
  where lower(trim(full_name)) in ('saiful azam', 'sumon', 'tarekul islam', 'tareq')
    and default_rent = 0;
update public.member_directory set default_rent = 1667
  where lower(trim(full_name)) in ('saiful azam', 'sumon', 'tarekul islam', 'tareq')
    and default_rent = 0;

-- Back-fill member_month rows that have no rent override yet.
-- Only touches rows where house_rent is NULL (not admin-edited ones).
update public.member_month mm
  set house_rent = p.default_rent
  from public.profiles p
  where mm.user_id = p.id
    and mm.house_rent is null;

-- Ensure member_month table exists (in case 0003 has not been run yet).
create table if not exists public.member_month (
  month_id uuid not null references public.months (id) on delete cascade,
  user_id  uuid not null references public.profiles (id) on delete cascade,
  house_rent numeric(10,2),
  is_paid boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (month_id, user_id)
);

alter table public.member_month enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'member_month' and policyname = 'member_month select'
  ) then
    create policy "member_month select" on public.member_month
      for select to authenticated using (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'member_month' and policyname = 'member_month admin write'
  ) then
    create policy "member_month admin write" on public.member_month
      for all to authenticated using (is_admin()) with check (is_admin());
  end if;
end $$;

-- Seed member_month rows for ALL existing months using each member's
-- current default_rent (skips rows already present via ON CONFLICT).
do $$
declare
  r record;
begin
  for r in select id from public.months loop
    insert into public.member_month (month_id, user_id, house_rent)
    select r.id, p.id, p.default_rent
    from public.profiles p
    where p.is_active
    on conflict (month_id, user_id) do nothing;
  end loop;
end $$;
