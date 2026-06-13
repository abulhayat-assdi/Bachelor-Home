-- ============================================================
-- AVATAR STORAGE — restrict upload/update to own folder
-- ------------------------------------------------------------
-- Previously any authenticated user could upload/update any
-- file in the avatars bucket. Now: members can only write to
-- their own {user_id}/ folder; admins can write anywhere
-- (needed for the admin-side avatar upload in MemberManager).
-- ============================================================

drop policy if exists "avatars auth upload" on storage.objects;
drop policy if exists "avatars auth update" on storage.objects;

create policy "avatars auth upload" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin' and is_active
      )
    )
  );

create policy "avatars auth update" on storage.objects
  for update to authenticated using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin' and is_active
      )
    )
  );
