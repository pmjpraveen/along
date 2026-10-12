-- Import plans from pasted text calls a language model, which costs money, so each person gets a daily allowance. The edge function claims one
-- before every call. Only trip members can claim, and the table is reachable only through this function (RLS on, no policies).
create table itinerary_imports (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  trip_id    uuid not null references trips(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table itinerary_imports enable row level security;
create index itinerary_imports_user_day on itinerary_imports (user_id, created_at desc);

create function claim_itinerary_import(p_trip uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_trip_member(p_trip) then raise exception 'not a member of this trip' using errcode = '42501'; end if;
  if (select count(*) from itinerary_imports where user_id = auth.uid() and created_at > now() - interval '1 day') >= 20 then
    raise exception 'import_limit' using errcode = 'P0001';
  end if;
  insert into itinerary_imports (user_id, trip_id) values (auth.uid(), p_trip);
end $$;
revoke execute on function claim_itinerary_import from public, anon;
grant execute on function claim_itinerary_import to authenticated;
