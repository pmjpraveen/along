-- A trip's cover photo. The file lives in the private 'covers' bucket under {trip_id}/, and trips.cover_url holds that
-- storage path (the app signs it for display). Only the owner can set or replace it. An https URL is also accepted as a
-- cover_url when set by an administrator or the dev seed, so sample data can look real without uploading files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy covers_files_read on storage.objects for select to authenticated
  using (bucket_id = 'covers' and is_trip_member(safe_uuid((storage.foldername(name))[1])));
create policy covers_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and is_trip_owner(safe_uuid((storage.foldername(name))[1])));
create policy covers_files_update on storage.objects for update to authenticated
  using (bucket_id = 'covers' and is_trip_owner(safe_uuid((storage.foldername(name))[1])));

create function set_trip_cover(p_trip uuid, p_path text) returns trips
language plpgsql security definer set search_path = public as $$
declare v_trip trips;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_trip_owner(p_trip) then raise exception 'only the owner can change the cover' using errcode = '42501'; end if;
  if p_path is null or p_path not like p_trip::text || '/%' then
    raise exception 'the cover must be a file in this trip''s folder' using errcode = '22023';
  end if;
  update trips set cover_url = p_path where id = p_trip and deleted_at is null returning * into v_trip;
  if not found then raise exception 'trip not found' using errcode = '42501'; end if;
  return v_trip;
end $$;
revoke execute on function set_trip_cover from public, anon;
grant execute on function set_trip_cover to authenticated;
