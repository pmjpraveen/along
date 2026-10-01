-- A trip owner can add someone who already uses along straight to the trip by their email, with no invite link. Only the owner can ask,
-- and the answer says no more than "added" or "no one with that email", so it is not a way to browse accounts.
create function add_member_by_email(p_trip uuid, p_email text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid;
  v_user users;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_trip_owner(p_trip) then raise exception 'only the owner can add people' using errcode = '42501'; end if;
  if not exists (select 1 from trips where id = p_trip and deleted_at is null) then raise exception 'trip not found' using errcode = 'P0002'; end if;
  select * into v_user from users where lower(email) = lower(trim(coalesce(p_email, ''))) and status = 'active';
  if not found then raise exception 'user_not_found' using errcode = 'P0001'; end if;
  if exists (select 1 from trip_members where trip_id = p_trip and user_id = v_user.id and status <> 'removed') then
    raise exception 'already_member' using errcode = 'P0001';
  end if;
  v_me := my_member_id(p_trip);
  insert into trip_members (trip_id, user_id, display_name, avatar_url, membership_type, role, status, invited_by_member_id, joined_at)
  values (p_trip, v_user.id, v_user.display_name, v_user.avatar_url, 'registered', 'member', 'active', v_me, now());
  return v_user.display_name;
end $$;
revoke execute on function add_member_by_email from public, anon;
grant execute on function add_member_by_email to authenticated;

notify pgrst, 'reload schema';
