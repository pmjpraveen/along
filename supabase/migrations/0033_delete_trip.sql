-- Delete trip: the owner removes the trip for everyone. Nothing is erased. The trip is marked deleted, so its expenses, payments and history
-- stay in the database (money rows are never hard-deleted), and row-level security, which already hides a deleted trip, stops every member
-- seeing it. Only the owner can do it.

create function delete_trip(p_trip uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_trip_owner(p_trip) then raise exception 'only the owner can delete the trip' using errcode = '42501'; end if;
  update trips set deleted_at = now() where id = p_trip and deleted_at is null;
  if not found then raise exception 'trip not found' using errcode = 'P0002'; end if;
end $$;
revoke execute on function delete_trip from public, anon;
grant execute on function delete_trip to authenticated;
