-- Trip details: the owner can rename the trip, change its destination and add a comment, and pick the colour of its card (one of six).
-- Name, comment and destination can only change while the trip is open, like the dates and the currency. The card colour can be chosen at
-- any time, because it is mostly seen on the Completed trips page. Updates check the version the caller read, so a concurrent edit is
-- rejected instead of silently overwritten.

alter table trips add column card_color smallint check (card_color between 0 and 5);

-- `select t.*` in the view is fixed when the view is made, so it is made again to carry the new column.
drop view trip_phase;
create view trip_phase with (security_invoker = true) as
select t.*,
  case
    when t.status in ('draft', 'completed', 'archived') then t.status::text
    when (now() at time zone t.timezone)::date < t.start_date then 'upcoming'
    else 'active'
  end as phase
from trips t
where t.deleted_at is null;

create function update_trip_details(p_trip uuid, p_version int, p_name text, p_destination text, p_description text) returns trips
language plpgsql security definer set search_path = public as $$
declare v_trip trips;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_trip_owner(p_trip) then raise exception 'only the owner can change the trip' using errcode = '42501'; end if;
  if p_name is null or length(trim(p_name)) = 0 then raise exception 'name required' using errcode = '23514'; end if;
  if p_destination is null or length(trim(p_destination)) = 0 then raise exception 'destination required' using errcode = '23514'; end if;
  select * into v_trip from trips where id = p_trip and deleted_at is null for update;
  if not found then raise exception 'trip not found' using errcode = 'P0002'; end if;
  if v_trip.status in ('completed', 'archived') then raise exception 'trip is not open' using errcode = '55000'; end if;
  if v_trip.version <> p_version then raise exception 'stale_version' using errcode = 'P0001'; end if;
  update trips set name = trim(p_name), destination_name = trim(p_destination), description = nullif(trim(coalesce(p_description, '')), '')
   where id = p_trip returning * into v_trip;
  return v_trip;
end $$;
revoke execute on function update_trip_details from public, anon;
grant execute on function update_trip_details to authenticated;

create function set_trip_card_color(p_trip uuid, p_color smallint) returns trips
language plpgsql security definer set search_path = public as $$
declare v_trip trips;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_trip_owner(p_trip) then raise exception 'only the owner can change the card colour' using errcode = '42501'; end if;
  if p_color is not null and (p_color < 0 or p_color > 5) then raise exception 'unknown colour' using errcode = '22023'; end if;
  update trips set card_color = p_color where id = p_trip and deleted_at is null returning * into v_trip;
  if not found then raise exception 'trip not found' using errcode = 'P0002'; end if;
  return v_trip;
end $$;
revoke execute on function set_trip_card_color from public, anon;
grant execute on function set_trip_card_color to authenticated;
