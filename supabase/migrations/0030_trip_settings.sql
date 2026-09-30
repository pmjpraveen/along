-- Trip settings: the owner can change the trip's dates and its currency.
-- Dates: items outside the new range are not removed; they are flagged (itinerary_items_flagged already does that).
-- Currency: every amount is stored in the currency's minor units and the app never converts, so the currency can only change while the
-- trip has no expenses or settlements. A trip that is over (completed or archived) cannot be changed.

create function update_trip_dates(p_trip uuid, p_start date, p_end date) returns trips
language plpgsql security definer set search_path = public as $$
declare v_trip trips;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_trip_owner(p_trip) then raise exception 'only the owner can change the dates' using errcode = '42501'; end if;
  if p_start is null or p_end is null or p_end < p_start then raise exception 'end date cannot be before the start date' using errcode = '23514'; end if;
  update trips set start_date = p_start, end_date = p_end
   where id = p_trip and deleted_at is null and status not in ('completed', 'archived') returning * into v_trip;
  if not found then raise exception 'trip is not open' using errcode = '55000'; end if;
  return v_trip;
end $$;
revoke execute on function update_trip_dates from public, anon;
grant execute on function update_trip_dates to authenticated;

create function set_trip_currency(p_trip uuid, p_currency char(3)) returns trips
language plpgsql security definer set search_path = public as $$
declare v_trip trips;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_trip_owner(p_trip) then raise exception 'only the owner can change the currency' using errcode = '42501'; end if;
  if not exists (select 1 from currencies where code = p_currency) then raise exception 'unknown currency' using errcode = '22023'; end if;
  if exists (select 1 from expenses where trip_id = p_trip and deleted_at is null)
     or exists (select 1 from settlements where trip_id = p_trip) then
    raise exception 'currency_locked' using errcode = '55000';
  end if;
  update trips set primary_currency = p_currency
   where id = p_trip and deleted_at is null and status not in ('completed', 'archived') returning * into v_trip;
  if not found then raise exception 'trip is not open' using errcode = '55000'; end if;
  return v_trip;
end $$;
revoke execute on function set_trip_currency from public, anon;
grant execute on function set_trip_currency to authenticated;
