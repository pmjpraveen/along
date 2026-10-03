-- Undo a plan delete: the person who added it, or the trip owner, brings back a plan that was just deleted.
create function restore_itinerary_item(p_item uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_item itinerary_items;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select * into v_item from itinerary_items where id = p_item and deleted_at is not null;
  if not found then raise exception 'item not found' using errcode = 'P0002'; end if;
  if not coalesce(v_item.created_by_member_id = my_member_id(v_item.trip_id) or is_trip_owner(v_item.trip_id), false) then
    raise exception 'only the creator or owner can restore this plan' using errcode = '42501';
  end if;
  update itinerary_items set deleted_at = null where id = p_item;
end $$;
revoke execute on function restore_itinerary_item from public, anon;
grant execute on function restore_itinerary_item to authenticated;

notify pgrst, 'reload schema';
