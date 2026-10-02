-- People on the same trip can see each other's profile pictures. The file stays private to the bucket; this lets a co-member sign it.
create function shares_trip_with(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from trip_members a join trip_members b on b.trip_id = a.trip_id
    where a.user_id = auth.uid() and a.status = 'active' and b.user_id = p_user and b.status = 'active');
$$;
revoke execute on function shares_trip_with from public, anon;
grant execute on function shares_trip_with to authenticated;

create policy avatars_files_read_trip on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and shares_trip_with(((storage.foldername(name))[1])::uuid));

-- A new picture also reaches the person's seat on each trip (trip_members.avatar_url is a copy taken when they joined).
create or replace function set_my_avatar(p_path text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_path is not null and p_path not like auth.uid()::text || '/%' then
    raise exception 'the picture must be a file in your own folder' using errcode = '22023';
  end if;
  update users set avatar_url = p_path where id = auth.uid();
  update trip_members set avatar_url = p_path where user_id = auth.uid();
end $$;

update trip_members m set avatar_url = u.avatar_url from users u where u.id = m.user_id and m.avatar_url is distinct from u.avatar_url and u.status <> 'disabled';

notify pgrst, 'reload schema';
