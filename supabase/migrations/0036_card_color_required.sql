-- Every trip has a card colour: it is given when the trip is created (see trips_card_color) and can only be changed to another of the six, never
-- removed. The column was left optional while existing trips were given theirs; now none is empty, so it is made required.

alter table trips alter column card_color set not null;

create or replace function set_trip_card_color(p_trip uuid, p_color smallint) returns trips
language plpgsql security definer set search_path = public as $$
declare v_trip trips;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_trip_owner(p_trip) then raise exception 'only the owner can change the card colour' using errcode = '42501'; end if;
  if p_color is null or p_color < 0 or p_color > 5 then raise exception 'unknown colour' using errcode = '22023'; end if;
  update trips set card_color = p_color where id = p_trip and deleted_at is null returning * into v_trip;
  if not found then raise exception 'trip not found' using errcode = 'P0002'; end if;
  return v_trip;
end $$;
