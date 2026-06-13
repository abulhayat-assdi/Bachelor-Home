-- ============================================================
-- FIX: meal guard — allow future dates, block only past days
-- ------------------------------------------------------------
-- Idempotent. Safe to run even if 0002 was already applied.
-- Replaces the original 0001 trigger that blocked entry_date >
-- current_date. Now members can log meals for today or any
-- future date; past days are frozen (admins can still fix them).
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
  -- Past days (before today) are frozen for members; admins can edit them.
  if new.entry_date < current_date and not is_admin() then
    raise exception 'Past meals are locked. Only an admin can edit them.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Ensure RLS allows members to insert/update any of their own rows
-- (including future dates) and admins can fix any row.
drop policy if exists "meals insert own" on public.meal_entries;
create policy "meals insert own" on public.meal_entries
  for insert to authenticated
  with check (user_id = auth.uid() or is_admin());

drop policy if exists "meals update own" on public.meal_entries;
create policy "meals update own" on public.meal_entries
  for update to authenticated
  using  (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());
