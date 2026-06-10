-- ============================================================
-- AAMADER BARI — Initial Schema
-- Run this in Supabase SQL Editor (or via supabase db push)
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- MEMBER DIRECTORY (seeded; controls role/order when a user signs up)
-- ------------------------------------------------------------
create table public.member_directory (
  email text primary key,
  full_name text not null,
  role text not null default 'member' check (role in ('member', 'admin')),
  order_index int not null,
  is_active boolean not null default true
);

-- ------------------------------------------------------------
-- PROFILES
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text unique not null,
  avatar_url text,
  role text not null default 'member' check (role in ('member', 'admin')),
  order_index int,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- MONTHS
-- ------------------------------------------------------------
create table public.months (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  month int not null check (month between 1 and 12),
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  unique (year, month)
);

-- ------------------------------------------------------------
-- MEAL ENTRIES
-- ------------------------------------------------------------
create table public.meal_entries (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.months (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null,
  breakfast numeric(4, 2) not null default 0 check (breakfast >= 0),
  lunch numeric(4, 2) not null default 0 check (lunch >= 0),
  dinner numeric(4, 2) not null default 0 check (dinner >= 0),
  total_meals numeric(6, 2) generated always as (breakfast + lunch + dinner) stored,
  updated_at timestamptz not null default now(),
  unique (month_id, user_id, entry_date)
);

-- Edit history log for meal entries
create table public.meal_entry_logs (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references public.meal_entries (id) on delete cascade,
  user_id uuid,
  entry_date date,
  old_breakfast numeric(4, 2),
  old_lunch numeric(4, 2),
  old_dinner numeric(4, 2),
  new_breakfast numeric(4, 2),
  new_lunch numeric(4, 2),
  new_dinner numeric(4, 2),
  changed_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- BAZAR DUTY SCHEDULE
-- ------------------------------------------------------------
create table public.bazar_duty_schedule (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.months (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  duty_date date not null,
  unique (month_id, duty_date)
);

-- ------------------------------------------------------------
-- BAZAR EXPENSES
-- ------------------------------------------------------------
create table public.bazar_expenses (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.months (id) on delete cascade,
  shopper_id uuid not null references public.profiles (id),
  expense_date date not null,
  amount numeric(10, 2) not null check (amount >= 0),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (month_id, expense_date, shopper_id)
);

-- ------------------------------------------------------------
-- OTHER EXPENSES (rent / utilities / custom)
-- ------------------------------------------------------------
create table public.other_expenses (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.months (id) on delete cascade,
  category text not null check (category in ('rent', 'electricity', 'gas', 'water', 'custom')),
  label text,
  amount numeric(10, 2) not null check (amount >= 0),
  split_method text not null default 'equal' check (split_method in ('equal', 'meal_based')),
  added_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- NOTIFICATIONS
-- ------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_recipient_idx on public.notifications (recipient_id, is_read, created_at desc);
create index meal_entries_month_idx on public.meal_entries (month_id, entry_date);
create index bazar_expenses_month_idx on public.bazar_expenses (month_id, expense_date);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin' and is_active
  );
$$;

-- Insert a notification for every active member (optionally excluding one)
create or replace function public.notify_members(p_except uuid, p_type text, p_message text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into notifications (recipient_id, type, message)
  select id, p_type, p_message
  from profiles
  where is_active and (p_except is null or id <> p_except);
end;
$$;

-- ============================================================
-- PROFILE AUTO-CREATION ON SIGNUP
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  d record;
begin
  select * into d from member_directory where lower(email) = lower(new.email);
  insert into profiles (id, email, full_name, role, order_index)
  values (
    new.id,
    new.email,
    coalesce(d.full_name, new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(d.role, 'member'),
    coalesce(d.order_index, (select coalesce(max(order_index), 0) + 1 from profiles))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- "X has joined the house!" notification
create or replace function public.notify_member_joined()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform notify_members(new.id, 'member_joined', new.full_name || ' has joined Aamader Bari!');
  return new;
end;
$$;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.notify_member_joined();

-- ============================================================
-- MONTH CREATION + BAZAR DUTY DISTRIBUTION
-- ============================================================

-- Distribute the month's days equally among active members (PRD 4B):
-- base = days / count, remainder goes to the first members in fixed order,
-- assigned as consecutive date blocks.
create or replace function public.regenerate_duty_schedule(p_month_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_year int;
  v_month int;
  v_days int;
  v_members uuid[];
  v_count int;
  v_base int;
  v_rem int;
  v_day int := 1;
  i int;
  take int;
  j int;
begin
  select year, month into v_year, v_month from months where id = p_month_id;
  if v_year is null then
    raise exception 'Month not found';
  end if;
  v_days := extract(day from (make_date(v_year, v_month, 1) + interval '1 month - 1 day'))::int;
  select array_agg(id order by order_index) into v_members from profiles where is_active;
  v_count := coalesce(array_length(v_members, 1), 0);
  delete from bazar_duty_schedule where month_id = p_month_id;
  if v_count = 0 then
    return;
  end if;
  v_base := v_days / v_count;
  v_rem := v_days % v_count;
  for i in 1 .. v_count loop
    take := v_base + case when i <= v_rem then 1 else 0 end;
    for j in 1 .. take loop
      insert into bazar_duty_schedule (month_id, user_id, duty_date)
      values (p_month_id, v_members[i], make_date(v_year, v_month, v_day));
      v_day := v_day + 1;
    end loop;
  end loop;
end;
$$;

-- Get-or-create a month row (also generates the duty schedule on creation)
create or replace function public.ensure_month(p_year int, p_month int)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  m_id uuid;
begin
  select id into m_id from months where year = p_year and month = p_month;
  if m_id is null then
    insert into months (year, month) values (p_year, p_month)
    on conflict (year, month) do nothing;
    select id into m_id from months where year = p_year and month = p_month;
    perform regenerate_duty_schedule(m_id);
  end if;
  return m_id;
end;
$$;

-- Admin: reassign a single duty day to another member
create or replace function public.reassign_duty(p_month_id uuid, p_date date, p_user uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;
  insert into bazar_duty_schedule (month_id, user_id, duty_date)
  values (p_month_id, p_user, p_date)
  on conflict (month_id, duty_date) do update set user_id = excluded.user_id;
end;
$$;

-- Admin: regenerate the duty schedule (after member add/remove)
create or replace function public.admin_regenerate_schedule(p_month_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;
  perform regenerate_duty_schedule(p_month_id);
end;
$$;

-- ============================================================
-- GUARDS (locked month, future dates) + EDIT LOG
-- ============================================================

create or replace function public.guard_meal_entry()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_locked boolean;
begin
  select is_locked into v_locked from months where id = new.month_id;
  if v_locked then
    raise exception 'This month is locked by admin. No further edits.';
  end if;
  if new.entry_date > current_date then
    raise exception 'Future dates are locked until that day arrives.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger guard_meal_entry_trg
  before insert or update on public.meal_entries
  for each row execute function public.guard_meal_entry();

create or replace function public.log_meal_edit()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if old.breakfast <> new.breakfast or old.lunch <> new.lunch or old.dinner <> new.dinner then
    insert into meal_entry_logs (entry_id, user_id, entry_date,
      old_breakfast, old_lunch, old_dinner, new_breakfast, new_lunch, new_dinner)
    values (new.id, new.user_id, new.entry_date,
      old.breakfast, old.lunch, old.dinner, new.breakfast, new.lunch, new.dinner);
  end if;
  return new;
end;
$$;

create trigger log_meal_edit_trg
  after update on public.meal_entries
  for each row execute function public.log_meal_edit();

create or replace function public.guard_bazar_expense()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_locked boolean;
begin
  select is_locked into v_locked from months where id = new.month_id;
  if v_locked then
    raise exception 'This month is locked by admin. No further edits.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger guard_bazar_expense_trg
  before insert or update on public.bazar_expenses
  for each row execute function public.guard_bazar_expense();

-- ============================================================
-- NOTIFICATION TRIGGERS
-- ============================================================

create or replace function public.notify_bazar_added()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_name text;
begin
  select full_name into v_name from profiles where id = new.shopper_id;
  perform notify_members(
    new.shopper_id,
    'bazar_added',
    v_name || ' added bazar expense of ৳' || trim(to_char(new.amount, 'FM999999990.00'))
      || ' on ' || to_char(new.expense_date, 'DD Mon')
  );
  return new;
end;
$$;

create trigger notify_bazar_added_trg
  after insert on public.bazar_expenses
  for each row execute function public.notify_bazar_added();

create or replace function public.notify_bazar_updated()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_name text;
begin
  if old.amount <> new.amount or coalesce(old.comment, '') <> coalesce(new.comment, '') then
    select full_name into v_name from profiles where id = new.shopper_id;
    perform notify_members(
      new.shopper_id,
      'bazar_updated',
      v_name || ' updated bazar expense to ৳' || trim(to_char(new.amount, 'FM999999990.00'))
        || ' on ' || to_char(new.expense_date, 'DD Mon')
    );
  end if;
  return new;
end;
$$;

create trigger notify_bazar_updated_trg
  after update on public.bazar_expenses
  for each row execute function public.notify_bazar_updated();

-- Meal update notifications (deduped: max 1 per person/date per 30 min to avoid spam)
create or replace function public.notify_meal_updated()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_name text;
  v_msg text;
begin
  select full_name into v_name from profiles where id = new.user_id;
  v_msg := v_name || ' updated meal count for ' || to_char(new.entry_date, 'DD Mon');
  if not exists (
    select 1 from notifications
    where type = 'meal_updated'
      and message = v_msg
      and created_at > now() - interval '30 minutes'
  ) then
    perform notify_members(new.user_id, 'meal_updated', v_msg);
  end if;
  return new;
end;
$$;

create trigger notify_meal_updated_trg
  after update on public.meal_entries
  for each row execute function public.notify_meal_updated();

-- Month locked notification
create or replace function public.notify_month_locked()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.is_locked and not old.is_locked then
    perform notify_members(
      null,
      'month_locked',
      to_char(make_date(new.year, new.month, 1), 'Month YYYY') || ' has been locked by admin. Final bill is ready.'
    );
  end if;
  return new;
end;
$$;

create trigger notify_month_locked_trg
  after update on public.months
  for each row execute function public.notify_month_locked();

-- Admin: push "bill ready" notification with each member's share
create or replace function public.notify_bill_ready(p_month_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_year int;
  v_month int;
  v_total_bazar numeric := 0;
  v_total_meals numeric := 0;
  v_rate numeric := 0;
  v_members int := 0;
  v_equal_pool numeric := 0;
  v_meal_pool numeric := 0;
  rec record;
  v_share numeric;
  v_label text;
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;
  select year, month into v_year, v_month from months where id = p_month_id;
  v_label := trim(to_char(make_date(v_year, v_month, 1), 'Month YYYY'));

  select coalesce(sum(amount), 0) into v_total_bazar from bazar_expenses where month_id = p_month_id;
  select coalesce(sum(total_meals), 0) into v_total_meals from meal_entries where month_id = p_month_id;
  select count(*) into v_members from profiles where is_active;
  if v_total_meals > 0 then
    v_rate := v_total_bazar / v_total_meals;
  end if;
  select coalesce(sum(amount), 0) into v_equal_pool
    from other_expenses where month_id = p_month_id and (category <> 'custom' or split_method = 'equal');
  select coalesce(sum(amount), 0) into v_meal_pool
    from other_expenses where month_id = p_month_id and category = 'custom' and split_method = 'meal_based';

  for rec in
    select p.id, coalesce(sum(m.total_meals), 0) as meals
    from profiles p
    left join meal_entries m on m.user_id = p.id and m.month_id = p_month_id
    where p.is_active
    group by p.id
  loop
    v_share := rec.meals * v_rate
      + case when v_members > 0 then v_equal_pool / v_members else 0 end
      + case when v_total_meals > 0 then (rec.meals / v_total_meals) * v_meal_pool else 0 end;
    insert into notifications (recipient_id, type, message)
    values (
      rec.id,
      'bill_ready',
      'Monthly bill for ' || v_label || ' is ready. Your share: ৳' || trim(to_char(v_share, 'FM999999990.00'))
    );
  end loop;
end;
$$;

-- Internal functions: not callable directly by app users
revoke execute on function public.regenerate_duty_schedule(uuid) from public, anon, authenticated;
revoke execute on function public.notify_members(uuid, text, text) from public, anon, authenticated;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.member_directory enable row level security;
alter table public.profiles enable row level security;
alter table public.months enable row level security;
alter table public.meal_entries enable row level security;
alter table public.meal_entry_logs enable row level security;
alter table public.bazar_duty_schedule enable row level security;
alter table public.bazar_expenses enable row level security;
alter table public.other_expenses enable row level security;
alter table public.notifications enable row level security;

-- member_directory: admin read/write only (service role bypasses RLS)
create policy "directory admin read" on public.member_directory
  for select to authenticated using (is_admin());
create policy "directory admin write" on public.member_directory
  for all to authenticated using (is_admin()) with check (is_admin());

-- profiles: everyone reads; own row update; admin updates any
create policy "profiles select" on public.profiles
  for select to authenticated using (true);
create policy "profiles update own" on public.profiles
  for update to authenticated using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

-- months: everyone reads; admin inserts/locks
create policy "months select" on public.months
  for select to authenticated using (true);
create policy "months admin insert" on public.months
  for insert to authenticated with check (is_admin());
create policy "months admin update" on public.months
  for update to authenticated using (is_admin()) with check (is_admin());

-- meal_entries: read all; insert/update OWN rows only; no delete
create policy "meals select" on public.meal_entries
  for select to authenticated using (true);
create policy "meals insert own" on public.meal_entries
  for insert to authenticated with check (user_id = auth.uid());
create policy "meals update own" on public.meal_entries
  for update to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- meal_entry_logs: read all (written by security definer trigger)
create policy "meal logs select" on public.meal_entry_logs
  for select to authenticated using (true);

-- bazar_duty_schedule: read all; admin writes (also via rpc)
create policy "duty select" on public.bazar_duty_schedule
  for select to authenticated using (true);
create policy "duty admin write" on public.bazar_duty_schedule
  for all to authenticated using (is_admin()) with check (is_admin());

-- bazar_expenses: read all; shopper inserts/updates own rows for assigned
-- duty days; admin can do anything
create policy "bazar select" on public.bazar_expenses
  for select to authenticated using (true);
create policy "bazar insert own duty" on public.bazar_expenses
  for insert to authenticated with check (
    is_admin() or (
      shopper_id = auth.uid()
      and exists (
        select 1 from bazar_duty_schedule s
        where s.month_id = bazar_expenses.month_id
          and s.duty_date = bazar_expenses.expense_date
          and s.user_id = auth.uid()
      )
    )
  );
create policy "bazar update own" on public.bazar_expenses
  for update to authenticated using (shopper_id = auth.uid() or is_admin())
  with check (shopper_id = auth.uid() or is_admin());
create policy "bazar admin delete" on public.bazar_expenses
  for delete to authenticated using (is_admin());

-- other_expenses: read all; admin-only writes
create policy "other select" on public.other_expenses
  for select to authenticated using (true);
create policy "other admin write" on public.other_expenses
  for all to authenticated using (is_admin()) with check (is_admin());

-- notifications: own rows only
create policy "notifications select own" on public.notifications
  for select to authenticated using (recipient_id = auth.uid());
create policy "notifications update own" on public.notifications
  for update to authenticated using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table public.meal_entries;
alter publication supabase_realtime add table public.bazar_expenses;
alter publication supabase_realtime add table public.notifications;

-- ============================================================
-- STORAGE: avatars bucket (public read)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars auth upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars');
create policy "avatars auth update" on storage.objects
  for update to authenticated using (bucket_id = 'avatars');
