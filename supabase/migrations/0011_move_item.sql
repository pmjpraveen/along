-- Moves an item to another day (dates outside the trip range are allowed and flagged). The item keeps its id,
-- participants and everything else; it goes to the end of the new day's manual order.
-- The caller sends the version it read; a stale version is rejected instead of overwriting a concurrent edit.
create function move_itinerary_item(p_item uuid, p_day_date date, p_version int) returns itinerary_items
language plpgsql security definer set search_path = public as $$
declare v_item itinerary_items;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select * into v_item from itinerary_items where id = p_item and deleted_at is null for update;
  if not found or not coalesce(v_item.created_by_member_id = my_member_id(v_item.trip_id) or is_trip_owner(v_item.trip_id), false) then
    raise exception 'only the creator or owner can move this item' using errcode = '42501';
  end if;
  if v_item.version <> p_version then raise exception 'stale_version' using errcode = 'P0001'; end if;
  if v_item.day_date = p_day_date then return v_item; end if;
  update itinerary_items set day_date = p_day_date,
    sort_order = (select coalesce(max(sort_order) + 1, 0) from itinerary_items
                   where trip_id = v_item.trip_id and day_date = p_day_date and deleted_at is null)
  where id = p_item returning * into v_item;
  return v_item;
end $$;
revoke execute on function move_itinerary_item from public, anon;
grant execute on function move_itinerary_item to authenticated;

-- Fix: for a non-member my_member_id() is null, so the old check evaluated to null and let the call through.
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
