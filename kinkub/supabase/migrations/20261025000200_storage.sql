-- Storage buckets for avatars and trip images. Safe to rerun.
-- Files live under "<auth.uid()>/<filename>" so ownership is path-based.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('trip-images', 'trip-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read is served by the public bucket URL; listing stays owner-only.
drop policy if exists "kinkub media owner read" on storage.objects;
create policy "kinkub media owner read" on storage.objects for select to authenticated
  using (bucket_id in ('avatars', 'trip-images') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "kinkub media owner insert" on storage.objects;
create policy "kinkub media owner insert" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars', 'trip-images')
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
    and public.my_role() is not null
    and (bucket_id = 'avatars' or public.my_role() in ('buddy', 'guide', 'admin'))
  );

drop policy if exists "kinkub media owner update" on storage.objects;
create policy "kinkub media owner update" on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'trip-images') and (storage.foldername(name))[1] = auth.uid()::text)
  with check (
    bucket_id in ('avatars', 'trip-images')
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

drop policy if exists "kinkub media owner delete" on storage.objects;
create policy "kinkub media owner delete" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'trip-images') and (storage.foldername(name))[1] = auth.uid()::text);
