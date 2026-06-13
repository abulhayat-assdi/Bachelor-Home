-- ============================================================
-- DUTY SCHEDULE: remainder days go to Saiful Azam
-- ------------------------------------------------------------
-- days_in_month ÷ member_count (ordered by order_index, i.e. the
-- serial members were added in). When the month doesn't divide
-- evenly, the leftover 1–2+ days are assigned to Saiful Azam
-- instead of the first members. If no active member named
-- "Saiful Azam" exists, falls back to the old behaviour
-- (remainder to the first members in order).
-- ============================================================

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
  v_extra_user uuid;
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

  select id into v_extra_user
  from profiles
  where is_active and lower(trim(full_name)) = 'saiful azam'
  order by order_index
  limit 1;

  for i in 1 .. v_count loop
    if v_extra_user is not null then
      take := v_base + case when v_members[i] = v_extra_user then v_rem else 0 end;
    else
      take := v_base + case when i <= v_rem then 1 else 0 end;
    end if;
    for j in 1 .. take loop
      insert into bazar_duty_schedule (month_id, user_id, duty_date)
      values (p_month_id, v_members[i], make_date(v_year, v_month, v_day));
      v_day := v_day + 1;
    end loop;
  end loop;
end;
$$;

revoke execute on function public.regenerate_duty_schedule(uuid) from public, anon, authenticated;
