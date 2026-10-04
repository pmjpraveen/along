-- Edit a plan: title, day, time, place and message. Same rule as moving or deleting: the person who added it or the trip owner. The caller
-- sends the version it read, and a stale one is rejected instead of overwriting a concurrent edit. Every field is replaced, so clearing the
-- place or the message works. A day outside the trip's dates is allowed and flagged, and a plan moved to another day goes to the end of that
-- day's order. The existing triggers keep the version, the activity feed and the "moved" notification up to date.
create function update_itinerary_item(
  p_item uuid, p_version int, p_title text, p_day_date date, p_start_time time default null,
  p_location_text text default null, p_location_url text default null, p_latitude numeric default null, p_longitude numeric default null,
  p_formatted_address text default null, p_description text default null
) returns itinerary_items
language plpgsql security definer set search_path = public as $$
declare v_item itinerary_items;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select * into v_item from itinerary_items where id = p_item and deleted_at is null for update;
  if not found or not coalesce(v_item.created_by_member_id = my_member_id(v_item.trip_id) or is_trip_owner(v_item.trip_id), false) then
    raise exception 'only the creator or owner can edit this plan' using errcode = '42501';
  end if;
  if v_item.version <> p_version then raise exception 'stale_version' using errcode = 'P0001'; end if;
  if coalesce(trim(p_title), '') = '' then raise exception 'a plan needs a title' using errcode = '22023'; end if;
  if (p_latitude is null) <> (p_longitude is null) or abs(coalesce(p_latitude, 0)) > 90 or abs(coalesce(p_longitude, 0)) > 180 then
    raise exception 'invalid coordinates' using errcode = '22023';
  end if;
  update itinerary_items set
    title = trim(p_title), day_date = p_day_date,
    sort_order = case when day_date = p_day_date then sort_order
                      else (select coalesce(max(sort_order) + 1, 0) from itinerary_items
                             where trip_id = v_item.trip_id and day_date = p_day_date and deleted_at is null) end,
    start_time = p_start_time,
    end_time = case when p_start_time is not null and v_item.end_time >= p_start_time then v_item.end_time end,
    time_mode = case when p_start_time is null then 'none'::time_mode
                     when v_item.end_time >= p_start_time then 'range'::time_mode else 'exact'::time_mode end,
    location_text = nullif(trim(p_location_text), ''), location_url = nullif(trim(p_location_url), ''),
    latitude = p_latitude, longitude = p_longitude, formatted_address = nullif(trim(p_formatted_address), ''),
    description = nullif(trim(p_description), '')
  where id = p_item returning * into v_item;
  return v_item;
end $$;
revoke execute on function update_itinerary_item from public, anon;
grant execute on function update_itinerary_item to authenticated;
