-- The owner removes a guest who has not joined (a pseudo guest added by name). Someone who has joined, the owner included, is never removed
-- this way. The row is kept with status = 'removed', so every expense, split and payment that points at the guest stays valid in the history.
-- Any invite link for that guest stops working. Removing someone already removed does nothing.
create function remove_member(p_member uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_member trip_members;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select * into v_member from trip_members where id = p_member for update;
  if not found then raise exception 'member not found' using errcode = 'P0002'; end if;
  if not is_trip_owner(v_member.trip_id) then raise exception 'only the owner can remove people' using errcode = '42501'; end if;
  if v_member.status = 'removed' then return; end if;
  if v_member.membership_type <> 'guest' then raise exception 'only_guests_can_be_removed' using errcode = 'P0001'; end if;
  update trip_members set status = 'removed', removed_at = now() where id = p_member;
  update trip_invites set status = 'revoked' where claims_member_id = p_member and status = 'active';
end $$;
revoke execute on function remove_member from public, anon;
grant execute on function remove_member to authenticated;
