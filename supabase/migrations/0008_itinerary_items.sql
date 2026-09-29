create type itinerary_type as enum ('activity', 'place', 'restaurant', 'transport', 'stay', 'free_time', 'other');
create type time_mode      as enum ('none', 'exact', 'range', 'approximate');
create type day_period     as enum ('morning', 'afternoon', 'evening', 'night');

create table itinerary_items (
  id                    uuid primary key default gen_random_uuid(),
  trip_id               uuid not null references trips (id) on delete cascade,
  created_by_member_id  uuid not null,
  title                 text not null check (length(trim(title)) > 0),
  type                  itinerary_type not null default 'activity',
  day_date              date not null,                    -- deliberately not tied to the trip range
  time_mode             time_mode not null default 'none',
  start_time            time,
  end_time              time,
  day_period            day_period,
  sort_order            int not null default 0,
  location_text         text,
  location_url          text check (location_url is null or location_url ~* '^https?://'),
  place_id              text,
  latitude              numeric(9,6),
  longitude             numeric(9,6),
  formatted_address     text,
  map_preview_url       text,
  description           text,
  notes                 text,
  link_url              text,
  attachment_url        text,
  cost_minor            bigint check (cost_minor is null or cost_minor >= 0),
  currency              char(3) references currencies (code),
  version               int not null default 1,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,
  foreign key (created_by_member_id, trip_id) references trip_members (id, trip_id),
  constraint itinerary_items_id_trip unique (id, trip_id),
  constraint time_fields_match_mode check (
    case time_mode
      when 'none'        then start_time is null and end_time is null and day_period is null
      when 'exact'       then start_time is not null and end_time is null and day_period is null
      when 'range'       then start_time is not null and end_time is not null and end_time >= start_time and day_period is null
      when 'approximate' then day_period is not null and start_time is null and end_time is null
    end),
  constraint coords_paired check ((latitude is null) = (longitude is null)),
  constraint cost_has_currency check ((cost_minor is null) = (currency is null))
);
create index itinerary_items_timeline on itinerary_items (trip_id, day_date, start_time) where deleted_at is null;
create trigger itinerary_items_version before update on itinerary_items
  for each row execute function bump_version();

-- Reads under RLS; writes through RPCs (edit and delete arrive with their stories).
alter table itinerary_items enable row level security;
create policy items_select on itinerary_items for select to authenticated using (is_trip_member(trip_id));
revoke insert, update, delete on itinerary_items from authenticated, anon;

-- Items outside the trip dates are kept and flagged, never rejected.
create view itinerary_items_flagged with (security_invoker = true) as
select i.*, (i.day_date < t.start_date or i.day_date > t.end_date) as is_outside_trip_range
from itinerary_items i join trips t on t.id = i.trip_id
where i.deleted_at is null;

create function create_itinerary_item(
  p_trip uuid, p_title text, p_type itinerary_type, p_day_date date,
  p_start_time time default null, p_end_time time default null
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
  return v_row;
end $$;
revoke execute on function create_itinerary_item from public, anon;
grant execute on function create_itinerary_item to authenticated;
