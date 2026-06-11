-- ============================================================
-- BACHELOR HOME — Seed: initial 5 members (PRD Section 03)
-- Profiles are created automatically (trigger) when each member
-- first signs up / accepts invite with these emails.
-- ============================================================

insert into public.member_directory (email, full_name, role, order_index) values
  ('saifulazam.milton@gmail.com', 'Saiful Azam', 'member', 1),
  ('abulhayat.sm117@gmail.com',  'Abul Hayat',  'admin',  2),
  ('taraq.connect@gmail.com',    'Tareq',       'member', 3),
  ('arzinislams@gmail.com',      'Sumon',       'member', 4),
  ('jabedomar.assdi@gmail.com',  'Javed Omar',  'member', 5)
on conflict (email) do update
  set full_name = excluded.full_name,
      role = excluded.role,
      order_index = excluded.order_index;
