-- ============================================================
-- MEMBER DISPLAY ORDER — fixed serial across the whole app
-- ------------------------------------------------------------
-- Every list (bill, meals, bazar, duty, members) sorts by
-- order_index. This pins the agreed order by name, on both
-- profiles (live members) and member_directory (future re-signups).
-- Idempotent: matches case-insensitively and is safe to re-run.
--
--   1. Saiful Azam
--   2. Abul Hayat
--   3. Tarekul Islam (Tareq / Tarek)
--   4. Sumon
--   5. Jabed Omor (Javed Omar)
-- ============================================================

do $$
declare
  -- name (lowercased) -> desired order_index
  v_order jsonb := jsonb_build_object(
    'saiful azam',    1,
    'abul hayat',     2,
    'tarekul islam',  3,
    'tareq',          3,
    'tarek',          3,
    'sumon',          4,
    'jabed omor',     5,
    'javed omar',     5
  );
  k text;
  v int;
begin
  for k, v in select key, value::int from jsonb_each_text(v_order) loop
    update public.profiles
      set order_index = v
      where lower(trim(full_name)) = k;
    update public.member_directory
      set order_index = v
      where lower(trim(full_name)) = k;
  end loop;
end $$;
