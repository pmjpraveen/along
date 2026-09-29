-- One collectible record per completed trip per registered member. destination and dates are snapshotted at the moment
-- of award, so editing a completed trip later changes nothing on the stamp. The "one stamp per ..." policy lives entirely in
-- how stamp_key is built ('trip:' || trip_id), so changing it later needs no schema change.
create table passport_stamps (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users (id) on delete cascade,
  trip_id           uuid not null references trips (id) on delete cascade,
  destination_name  text not null,
  country_code      char(2),
  start_date        date not null,
  end_date          date not null,
  stamp_key         text not null,
  awarded_at        timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  constraint passport_stamp_once unique (user_id, stamp_key)
);
create index passport_stamps_by_user on passport_stamps (user_id, start_date desc);

alter table passport_stamps enable row level security;
create policy passport_stamps_select on passport_stamps for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on passport_stamps from authenticated, anon;

-- Awards a stamp to every active registered member of a completed trip that has begun (guests have no account, so wait
-- until they claim; a trip completed before its start date earns nothing). on conflict makes retries and re-completion no-ops.
create function award_trip_stamps(p_trip uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into passport_stamps (user_id, trip_id, destination_name, start_date, end_date, stamp_key)
  select m.user_id, t.id, t.destination_name, t.start_date, t.end_date, 'trip:' || t.id
  from trips t
  join trip_members m on m.trip_id = t.id and m.status = 'active' and m.user_id is not null
  where t.id = p_trip and t.status = 'completed' and t.deleted_at is null
    and t.start_date <= (now() at time zone t.timezone)::date
  on conflict (user_id, stamp_key) do nothing;
end $$;
revoke execute on function award_trip_stamps from public, anon, authenticated;

create or replace function complete_trip(p_trip uuid) returns trips
language plpgsql security definer set search_path = public as $$
declare v_trip trips;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_trip_owner(p_trip) then raise exception 'only the owner can complete this trip' using errcode = '42501'; end if;
  select * into v_trip from trips where id = p_trip and deleted_at is null for update;
  if not found then raise exception 'trip not found' using errcode = '42501'; end if;
  if v_trip.status in ('completed', 'archived') then return v_trip; end if;
  update trips set status = 'completed', completed_at = now() where id = p_trip returning * into v_trip;
  perform award_trip_stamps(p_trip);
  return v_trip;
end $$;

-- A guest who claims their spot on a trip that is already completed earns the stamp at that point.
create function trg_award_on_claim() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform award_trip_stamps(new.trip_id);
  return null;
end $$;
create trigger trip_members_award_on_claim after update of user_id on trip_members
  for each row when (old.user_id is null and new.user_id is not null) execute function trg_award_on_claim();
