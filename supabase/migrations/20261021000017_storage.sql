-- Task 6: Storage buckets and policies (lesson images by admins, avatars by their owner).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('lesson-images', 'lesson-images', true, 2097152, array['image/png','image/jpeg','image/webp','image/gif']),
  ('avatars', 'avatars', true, 1048576, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public buckets serve files by URL without SELECT; SELECT here only controls listing/upsert.
create policy lesson_images_admin_select on storage.objects for select to authenticated
  using (bucket_id = 'lesson-images' and public.is_admin());
create policy lesson_images_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'lesson-images' and public.is_admin());
create policy lesson_images_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'lesson-images' and public.is_admin())
  with check (bucket_id = 'lesson-images' and public.is_admin());
create policy lesson_images_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'lesson-images' and public.is_admin());

create policy avatars_own_select on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and name like auth.uid()::text || '/%');
create policy avatars_own_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and name like auth.uid()::text || '/%');
create policy avatars_own_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and name like auth.uid()::text || '/%')
  with check (bucket_id = 'avatars' and name like auth.uid()::text || '/%');
create policy avatars_own_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and name like auth.uid()::text || '/%');
