-- ============================================================
-- FIX: remove dead local variable v_name from set_member_role
-- ------------------------------------------------------------
-- Idempotent (create or replace). v_name was declared and
-- populated by a SELECT but never actually used. The SELECT
-- itself was a wasted round-trip; removing it also simplifies
-- the function body with no behaviour change.
-- ============================================================

create or replace function public.set_member_role(p_user uuid, p_role text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_admin_count int;
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;
  if p_role not in ('member', 'admin') then
    raise exception 'Invalid role';
  end if;

  -- Don't allow demoting the last remaining admin.
  if p_role = 'member' then
    select count(*) into v_admin_count
    from profiles where role = 'admin' and is_active;
    if v_admin_count <= 1
       and exists (select 1 from profiles where id = p_user and role = 'admin') then
      raise exception 'At least one admin must remain';
    end if;
  end if;

  update profiles set role = p_role where id = p_user;

  if p_role = 'admin' then
    insert into notifications (recipient_id, type, message)
    values (p_user, 'role_changed', 'You are now an admin of Bachelor Home.');
  else
    insert into notifications (recipient_id, type, message)
    values (p_user, 'role_changed', 'Your admin access has been removed.');
  end if;
end;
$$;
