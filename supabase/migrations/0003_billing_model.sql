-- ============================================================
-- BACHELOR HOME — Spreadsheet-aligned billing model
-- Run after 0002. Adds:
--   • per-member default house rent (admin editable per month)
--   • member_month table (house_rent override + paid status)
--   • common-bill + member-common-purchase expense categories
--   • auto-seeding of default common bills & member_month rows
-- ============================================================

-- ------------------------------------------------------------
-- A. Per-member default house rent
-- ------------------------------------------------------------
alter table public.member_directory
  add column if not exists default_rent numeric(10, 2) not null default 1667;
alter table public.profiles
  add column if not exists default_rent numeric(10, 2) not null default 1667;

-- Seed known higher rents (others keep the 1667 default)
update public.member_directory set default_rent = 2500
  where lower(email) in ('abulhayat.sm117@gmail.com', 'jabedomar.assdi@gmail.com');
update public.profiles set default_rent = 2500
  where lower(email) in ('abulhayat.sm117@gmail.com', 'jabedomar.assdi@gmail.com');

-- ------------------------------------------------------------
-- B. Expense categories — add common fixed bills + member common purchases
--    'common' = a member's shared non-food purchase (counts as their deposit)
-- ------------------------------------------------------------
alter table public.other_expenses drop constraint if exists other_expenses_category_check;
alter table public.other_expenses add constraint other_expenses_category_check
  check (category in (
    'rent', 'electricity', 'gas', 'water', 'wifi', 'maid', 'common', 'custom'
  ));

-- Members may log their OWN shared non-food purchases (category 'common').
-- Fixed bills + everyone-else edits stay admin-only via the existing policy.
drop policy if exists "other common insert own" on public.other_expenses;
create policy "other common insert own" on public.other_expenses
  for insert to authenticated
  with check (category = 'common' and added_by = auth.uid());

drop policy if exists "other common update own" on public.other_expenses;
create policy "other common update own" on public.other_expenses
  for update to authenticated
  using (category = 'common' and added_by = auth.uid())
  with check (category = 'common' and added_by = auth.uid());

drop policy if exists "other common delete own" on public.other_expenses;
create policy "other common delete own" on public.other_expenses
  for delete to authenticated
  using (category = 'common' and added_by = auth.uid());

-- ------------------------------------------------------------
-- C. Per-member, per-month settings: house rent + paid status
-- ------------------------------------------------------------
create table if not exists public.member_month (
  month_id uuid not null references public.months (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  house_rent numeric(10, 2),
  is_paid boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (month_id, user_id)
);

alter table public.member_month enable row level security;

create policy "member_month select" on public.member_month
  for select to authenticated using (true);
create policy "member_month admin write" on public.member_month
  for all to authenticated using (is_admin()) with check (is_admin());

-- ------------------------------------------------------------
-- D. Seed default common bills for a month (idempotent per category)
-- ------------------------------------------------------------
create or replace function public.seed_common_bills(p_month_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into other_expenses (month_id, category, label, amount, split_method, added_by)
  select p_month_id, v.cat, v.lbl, v.amt, 'equal', null
  from (values
    ('maid', 'Maid (Bua) Bill', 2500),
    ('wifi', 'Wifi Bill', 500),
    ('electricity', 'Electricity Bill', 700),
    ('water', 'Water Bill', 500)
  ) as v(cat, lbl, amt)
  where not exists (
    select 1 from other_expenses o
    where o.month_id = p_month_id and o.category = v.cat
  );
end;
$$;

-- ------------------------------------------------------------
-- E. Seed member_month rows (house_rent from each member's default)
-- ------------------------------------------------------------
create or replace function public.seed_member_month(p_month_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into member_month (month_id, user_id, house_rent)
  select p_month_id, id, default_rent from profiles where is_active
  on conflict (month_id, user_id) do nothing;
end;
$$;

-- ------------------------------------------------------------
-- F. ensure_month now also seeds common bills + member_month
-- ------------------------------------------------------------
create or replace function public.ensure_month(p_year int, p_month int)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  m_id uuid;
  was_new boolean := false;
begin
  select id into m_id from months where year = p_year and month = p_month;
  if m_id is null then
    insert into months (year, month) values (p_year, p_month)
    on conflict (year, month) do nothing;
    select id into m_id from months where year = p_year and month = p_month;
    was_new := true;
  end if;
  if was_new then
    perform regenerate_duty_schedule(m_id);
    perform seed_common_bills(m_id);
  end if;
  -- always ensure every active member has a settings row
  perform seed_member_month(m_id);
  return m_id;
end;
$$;

-- ------------------------------------------------------------
-- G. New signups inherit their directory default_rent
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  d record;
begin
  select * into d from member_directory where lower(email) = lower(new.email);
  insert into profiles (id, email, full_name, role, order_index, default_rent)
  values (
    new.id,
    new.email,
    coalesce(d.full_name, new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(d.role, 'member'),
    coalesce(d.order_index, (select coalesce(max(order_index), 0) + 1 from profiles)),
    coalesce(d.default_rent, 1667)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Internal helpers: not callable directly by app users
revoke execute on function public.seed_common_bills(uuid) from public, anon, authenticated;
revoke execute on function public.seed_member_month(uuid) from public, anon, authenticated;

-- member_month rides realtime so paid/rent edits sync live
alter publication supabase_realtime add table public.member_month;

-- ------------------------------------------------------------
-- H. Backfill already-created months with defaults
-- ------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in select id from months loop
    perform public.seed_common_bills(r.id);
    perform public.seed_member_month(r.id);
  end loop;
end $$;
