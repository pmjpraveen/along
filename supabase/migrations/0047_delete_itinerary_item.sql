-- Delete a plan. The person who added it or the trip owner can; the row is marked deleted (the schema's convention for plans, and an
-- expense can still point at one), and everything that reads plans already skips deleted ones.
create function delete_itinerary_item(p_item uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_item itinerary_items;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select * into v_item from itinerary_items where id = p_item and deleted_at is null;
  if not found then raise exception 'item not found' using errcode = 'P0002'; end if;
  if not coalesce(v_item.created_by_member_id = my_member_id(v_item.trip_id) or is_trip_owner(v_item.trip_id), false) then
    raise exception 'only the creator or owner can delete this plan' using errcode = '42501';
  end if;
  update itinerary_items set deleted_at = now() where id = p_item;
end $$;
revoke execute on function delete_itinerary_item from public, anon;
grant execute on function delete_itinerary_item to authenticated;

-- The same check in set_itinerary_participants compared with null for someone who is not on the trip, so it let them through. Fixed here.
create or replace function set_itinerary_participants(p_item uuid, p_member_ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare v_item itinerary_items;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select * into v_item from itinerary_items where id = p_item and deleted_at is null;
  if not found or not coalesce(v_item.created_by_member_id = my_member_id(v_item.trip_id) or is_trip_owner(v_item.trip_id), false) then
    raise exception 'only the creator or owner can change participants' using errcode = '42501';
  end if;
  perform replace_item_participants(p_item, v_item.trip_id, p_member_ids);
end $$;

notify pgrst, 'reload schema';
