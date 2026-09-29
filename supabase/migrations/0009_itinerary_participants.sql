create table itinerary_participants (
  id                 uuid primary key default gen_random_uuid(),
  trip_id            uuid not null,
  itinerary_item_id  uuid not null,
  trip_member_id     uuid not null,
  created_at         timestamptz not null default now(),
  unique (itinerary_item_id, trip_member_id),
  foreign key (itinerary_item_id, trip_id) references itinerary_items (id, trip_id) on delete cascade,
  foreign key (trip_member_id, trip_id)    references trip_members (id, trip_id)
);
create index itinerary_participants_member on itinerary_participants (trip_member_id);
alter table itinerary_participants enable row level security;
create policy itinerary_participants_select on itinerary_participants for select to authenticated using (is_trip_member(trip_id));
revoke insert, update, delete on itinerary_participants from authenticated, anon;

-- Internal: replaces an item's participant list. Callers check authorization first. Guests can participate.
create function replace_item_participants(p_item uuid, p_trip uuid, p_ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare v_ids uuid[] := coalesce(array(select distinct unnest(p_ids)), '{}');
begin
  if (select count(*) from trip_members where trip_id = p_trip and status = 'active' and id = any(v_ids)) <> cardinality(v_ids) then
    raise exception 'participants must be active members of this trip' using errcode = '22023';
  end if;
  delete from itinerary_participants where itinerary_item_id = p_item and trip_member_id <> all(v_ids);
  insert into itinerary_participants (trip_id, itinerary_item_id, trip_member_id)
  select p_trip, p_item, unnest(v_ids) on conflict do nothing;
end $$;
revoke execute on function replace_item_participants from public, anon, authenticated;

drop function create_itinerary_item(uuid, text, itinerary_type, date, time, time);
create function create_itinerary_item(
  p_trip uuid, p_title text, p_type itinerary_type, p_day_date date,
  p_start_time time default null, p_end_time time default null, p_participant_member_ids uuid[] default '{}'
) returns itinerary_items
language plpgsql security definer set search_path = public as $$
declare v_row itinerary_items;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_trip_member(p_trip) then raise exception 'not a member of this trip' using errcode = '42501'; end if;
  if p_end_time is not null and p_start_time is null then
    raise exception 'end time needs a start time' using errcode = '23514';
  end if;
  insert into itinerary_items (trip_id, created_by_member_id, title, type, day_date, time_mode, start_time, end_time, sort_order)
  values (p_trip, my_member_id(p_trip), trim(p_title), p_type, p_day_date,
          case when p_start_time is null then 'none'::time_mode when p_end_time is null then 'exact' else 'range' end,
          p_start_time, p_end_time,
          (select coalesce(max(sort_order) + 1, 0) from itinerary_items
            where trip_id = p_trip and day_date = p_day_date and deleted_at is null))
  returning * into v_row;
  perform replace_item_participants(v_row.id, p_trip, p_participant_member_ids);
  return v_row;
end $$;
revoke execute on function create_itinerary_item from public, anon;
grant execute on function create_itinerary_item to authenticated;

create function set_itinerary_participants(p_item uuid, p_member_ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare v_item itinerary_items;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select * into v_item from itinerary_items where id = p_item and deleted_at is null;
  if not found or not (v_item.created_by_member_id = my_member_id(v_item.trip_id) or is_trip_owner(v_item.trip_id)) then
    raise exception 'only the creator or owner can change participants' using errcode = '42501';
  end if;
  perform replace_item_participants(p_item, v_item.trip_id, p_member_ids);
end $$;
revoke execute on function set_itinerary_participants from public, anon;
grant execute on function set_itinerary_participants to authenticated;
