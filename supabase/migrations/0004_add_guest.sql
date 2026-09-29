create function is_trip_owner(p_trip uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from trip_members m
                 where m.trip_id = p_trip and m.user_id = auth.uid()
                   and m.status = 'active' and m.role = 'owner')
$$;

-- Guests are name-only rows: no account, no session; the owner manages them. Same name twice is allowed, never merged.
create function add_guest_member(p_trip uuid, p_display_name text) returns trip_members
language plpgsql security definer set search_path = public as $$
declare
  v_name text := trim(coalesce(p_display_name, ''));
  v_row trip_members;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_trip_owner(p_trip) then raise exception 'only the owner can add guests' using errcode = '42501'; end if;
  if length(v_name) = 0 or length(v_name) > 60 then
    raise exception 'guest name must be 1-60 characters' using errcode = '22023';
  end if;
  insert into trip_members (trip_id, user_id, display_name, membership_type, role, status, invited_by_member_id)
  values (p_trip, null, v_name, 'guest', 'guest', 'active', my_member_id(p_trip))
  returning * into v_row;
  return v_row;
end $$;
revoke execute on function add_guest_member, is_trip_owner from public, anon;
grant execute on function add_guest_member, is_trip_owner to authenticated;
