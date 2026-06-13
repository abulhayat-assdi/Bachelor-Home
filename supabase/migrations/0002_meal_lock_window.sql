-- ============================================================
-- BACHELOR HOME — Meal lock window  [SUPERSEDED by 0006_fix_meal_guard.sql]
-- Change the meal editing rules (run after 0001_init.sql):
--   • Future days are now OPEN — members may plan ahead.
--   • Today is open (unchanged).
--   • PAST days lock automatically — only an admin can edit them.
-- A locked MONTH still blocks everyone, as before.
--
-- NOTE: 0006 re-applies this exact function and policies idempotently.
-- If 0006 has run, this file is effectively a no-op. Safe to keep.
-- ============================================================

-- Replace the meal guard. Previously it blocked future dates; now it
-- blocks past dates for non-admins instead.
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
  -- Yesterday and earlier are frozen for members; admins keep the keys.
  if new.entry_date < current_date and not is_admin() then
    raise exception 'Past meals are locked. Only an admin can edit them now.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Let admins insert/update ANY member's meal entry (to fix a locked past
-- day). Members are still limited to their own rows by the guard above.
drop policy if exists "meals insert own" on public.meal_entries;
create policy "meals insert own" on public.meal_entries
  for insert to authenticated with check (user_id = auth.uid() or is_admin());

drop policy if exists "meals update own" on public.meal_entries;
create policy "meals update own" on public.meal_entries
  for update to authenticated using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());
