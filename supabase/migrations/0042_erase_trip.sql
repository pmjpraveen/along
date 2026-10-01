-- Deleting a trip now erases it completely: the trip and everything that hangs off it (members, invites, plans, expenses and their splits,
-- payments, activity, notifications, memories, stamps) are removed from the database. The rest cascade from trips.
-- Payments are normally immutable; the one exception is this erase, which sets a flag for the length of the transaction so the
-- immutability guard lets the cascade through while still refusing every other update or delete.

create or replace function forbid_mutation() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and current_setting('along.erasing_trip', true) = old.trip_id::text then return old; end if;
  raise exception '% on % is not allowed; append a compensating row instead', tg_op, tg_table_name using errcode = '42501';
end $$;

create or replace function delete_trip(p_trip uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from trips where id = p_trip) then raise exception 'trip not found' using errcode = 'P0002'; end if;
  if not is_trip_owner(p_trip) then raise exception 'only the owner can delete the trip' using errcode = '42501'; end if;
  perform set_config('along.erasing_trip', p_trip::text, true);
  -- Children first, in order: the cascade alone would remove members before the rows that point at them.
  delete from expense_participants where trip_id = p_trip;
  delete from expenses where trip_id = p_trip;
  delete from settlements where trip_id = p_trip;
  delete from itinerary_participants where trip_id = p_trip;
  delete from itinerary_items where trip_id = p_trip;
  delete from trip_invites where trip_id = p_trip;
  delete from activity_events where trip_id = p_trip;
  delete from memories where trip_id = p_trip;
  delete from passport_stamps where trip_id = p_trip;
  delete from notifications where trip_id = p_trip;
  delete from notification_preferences where trip_id = p_trip;
  delete from trip_members where trip_id = p_trip;
  delete from trips where id = p_trip;
end $$;

-- The owner can remove the trip's cover and memory files from storage (the app does this just before erasing the trip).
create policy covers_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and is_trip_owner(safe_uuid((storage.foldername(name))[1])));
create policy memories_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'memories' and is_trip_owner(safe_uuid((storage.foldername(name))[1])));

notify pgrst, 'reload schema';
