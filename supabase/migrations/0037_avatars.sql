-- A profile picture. The file lives in the private 'avatars' bucket under {user_id}/, and users.avatar_url holds that storage path
-- (the app signs it for display). Each person can only write into their own folder and set their own picture.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy avatars_files_read on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_files_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create function set_my_avatar(p_path text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_path is not null and p_path not like auth.uid()::text || '/%' then
    raise exception 'the picture must be a file in your own folder' using errcode = '22023';
  end if;
  update users set avatar_url = p_path where id = auth.uid();
end $$;
revoke execute on function set_my_avatar from public, anon;
grant execute on function set_my_avatar to authenticated;

notify pgrst, 'reload schema';
