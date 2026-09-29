-- A plan can carry an optional message (the "Message" field on Plan details). The column already exists on itinerary_items; the
-- create RPC now accepts it. Replacing the function changes its signature, so the old one is dropped first.
drop function create_itinerary_item(uuid, text, itinerary_type, date, time, time, uuid[], text, text, numeric, numeric, text);
create function create_itinerary_item(
  p_trip uuid, p_title text, p_type itinerary_type, p_day_date date,
  p_start_time time default null, p_end_time time default null, p_participant_member_ids uuid[] default '{}',
  p_location_text text default null, p_location_url text default null, p_latitude numeric default null, p_longitude numeric default null,
  p_formatted_address text default null, p_description text default null
) returns itinerary_items
language plpgsql security definer set search_path = public as $$
declare v_row itinerary_items;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_trip_member(p_trip) then raise exception 'not a member of this trip' using errcode = '42501'; end if;
  if p_end_time is not null and p_start_time is null then
    raise exception 'end time needs a start time' using errcode = '23514';
  end if;
  if (p_latitude is null) <> (p_longitude is null) or abs(coalesce(p_latitude, 0)) > 90 or abs(coalesce(p_longitude, 0)) > 180 then
    raise exception 'invalid coordinates' using errcode = '22023';
  end if;
  insert into itinerary_items (trip_id, created_by_member_id, title, type, day_date, time_mode, start_time, end_time, sort_order,
                               location_text, location_url, latitude, longitude, formatted_address, description)
  values (p_trip, my_member_id(p_trip), trim(p_title), p_type, p_day_date,
          case when p_start_time is null then 'none'::time_mode when p_end_time is null then 'exact' else 'range' end,
          p_start_time, p_end_time,
          (select coalesce(max(sort_order) + 1, 0) from itinerary_items
            where trip_id = p_trip and day_date = p_day_date and deleted_at is null),
          nullif(trim(p_location_text), ''), nullif(trim(p_location_url), ''), p_latitude, p_longitude, nullif(trim(p_formatted_address), ''),
          nullif(trim(p_description), ''))
  returning * into v_row;
  perform replace_item_participants(v_row.id, p_trip, p_participant_member_ids);
  return v_row;
end $$;
revoke execute on function create_itinerary_item from public, anon;
grant execute on function create_itinerary_item to authenticated;
