-- ============================================================
-- ADMIN ROLE MANAGEMENT
-- ------------------------------------------------------------
-- Lets an existing admin promote another member to admin or
-- demote an admin back to member. Guards against:
--   * non-admins changing anyone's role (privilege escalation)
--   * removing the very last admin (lock-out)
-- ============================================================

-- Prevent role changes from anyone who is not an admin. The existing
-- "profiles update own" RLS policy lets a member edit their own row
-- (name, avatar) — this trigger makes sure they can't flip their own
-- role to 'admin' along the way. SECURITY DEFINER RPCs below still pass
-- because is_admin() is evaluated against the calling user (auth.uid()).
create or replace function public.guard_profile_role()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and not is_admin() then
    raise exception 'Only an admin can change roles';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_role_trg on public.profiles;
create trigger guard_profile_role_trg
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- Admin: set a member's role to 'member' or 'admin'.
create or replace function public.set_member_role(p_user uuid, p_role text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_name text;
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

  select full_name into v_name from profiles where id = p_user;
  if p_role = 'admin' then
    insert into notifications (recipient_id, type, message)
    values (p_user, 'role_changed', 'You are now an admin of Bachelor Home.');
  else
    insert into notifications (recipient_id, type, message)
    values (p_user, 'role_changed', 'Your admin access has been removed.');
  end if;
end;
$$;
