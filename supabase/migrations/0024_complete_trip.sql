-- upcoming / active are derived from the dates and the trip's own timezone; completed and archived come from status.
create view trip_phase with (security_invoker = true) as
select t.*,
  case
    when t.status in ('draft', 'completed', 'archived') then t.status::text
    when (now() at time zone t.timezone)::date < t.start_date then 'upcoming'
    else 'active'
  end as phase
from trips t
where t.deleted_at is null;

-- Moves a trip into history. Nothing is erased or frozen: expenses, the itinerary, people and outstanding balances stay
-- exactly as they were and stay readable, and balances can still be settled. Only the owner can complete a trip, and
-- completing an already completed (or archived) trip is a no-op, so a retry never changes completed_at.
create function complete_trip(p_trip uuid) returns trips
language plpgsql security definer set search_path = public as $$
declare v_trip trips;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_trip_owner(p_trip) then raise exception 'only the owner can complete this trip' using errcode = '42501'; end if;
  select * into v_trip from trips where id = p_trip and deleted_at is null for update;
  if not found then raise exception 'trip not found' using errcode = '42501'; end if;
  if v_trip.status in ('completed', 'archived') then return v_trip; end if;
  update trips set status = 'completed', completed_at = now() where id = p_trip returning * into v_trip;
  return v_trip;
end $$;
revoke execute on function complete_trip from public, anon;
grant execute on function complete_trip to authenticated;
