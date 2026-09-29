create type notification_type as enum ('trip_invitation', 'itinerary_change', 'new_expense', 'balance_change', 'settlement_update');

create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users (id) on delete cascade,
  trip_id     uuid references trips (id) on delete cascade,
  type        notification_type not null,
  payload     jsonb not null default '{}',   -- display fields only (who, what, how much); the client words them
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_inbox on notifications (user_id, created_at desc);

create table push_tokens (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users (id) on delete cascade,
  expo_push_token   text not null unique,
  platform          text not null check (platform in ('ios', 'android')),
  last_seen_at      timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

create table notification_preferences (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references users (id) on delete cascade,
  trip_id   uuid references trips (id) on delete cascade,   -- null = the user's default for all trips
  type      notification_type not null,
  enabled   boolean not null default true,
  unique nulls not distinct (user_id, trip_id, type)
);

-- Everyone reads only their own; every write goes through the functions below or the triggers.
alter table notifications enable row level security;
alter table push_tokens enable row level security;
alter table notification_preferences enable row level security;
create policy notifications_select on notifications for select to authenticated using (user_id = auth.uid());
create policy notification_preferences_select on notification_preferences for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on notifications, notification_preferences from authenticated, anon;
revoke all on push_tokens from authenticated, anon;

-- Inserts a notification for the registered, active members of a trip, except the person who did it, skipping anyone who
-- turned that type off (a trip-specific choice beats their default; no choice means on). Guests have no account, so get none.
-- p_only limits the audience; p_except removes people from it.
create function notify(p_trip uuid, p_actor uuid, p_type notification_type, p_payload jsonb, p_only uuid[] default null, p_except uuid[] default '{}')
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, trip_id, type, payload)
  select m.user_id, p_trip, p_type, p_payload
  from trip_members m
  where m.trip_id = p_trip and m.status = 'active' and m.user_id is not null
    and m.id is distinct from p_actor
    and (p_only is null or m.id = any(p_only))
    and m.id <> all(p_except)
    and coalesce(
      (select p.enabled from notification_preferences p where p.user_id = m.user_id and p.type = p_type and p.trip_id = p_trip),
      (select p.enabled from notification_preferences p where p.user_id = m.user_id and p.type = p_type and p.trip_id is null),
      true);
end $$;
revoke execute on function notify from public, anon, authenticated;

create function member_name(p_member uuid) returns text
language sql stable security definer set search_path = public as $$ select display_name from trip_members where id = p_member $$;
revoke execute on function member_name from public, anon, authenticated;
create function trip_name(p_trip uuid) returns text
language sql stable security definer set search_path = public as $$ select name from trips where id = p_trip $$;
revoke execute on function trip_name from public, anon, authenticated;

-- A new or edited expense. People whose balance it changes (the payer and everyone in the split) hear "balance_change";
-- for a new expense everyone else hears "new_expense". So each person gets one notification, of the type that fits.
-- Deferred to commit because the split rows are written after the expense row.
create function trg_notify_expense() returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := case tg_op when 'INSERT' then new.created_by_member_id else my_member_id(new.trip_id) end;
  v_affected uuid[];
  v_payload jsonb;
begin
  if new.deleted_at is not null then return null; end if;
  select coalesce(array_agg(trip_member_id), '{}') into v_affected from expense_participants where expense_id = new.id;
  v_affected := array_append(v_affected, new.paid_by_member_id);
  if tg_op = 'UPDATE' then v_affected := array_append(v_affected, old.paid_by_member_id); end if;
  v_payload := jsonb_build_object(
    'actor', member_name(v_actor), 'trip', trip_name(new.trip_id), 'title', new.title,
    'amount_minor', new.amount_minor, 'currency', new.currency,
    'exponent', (select minor_unit_exponent from currencies where code = new.currency),
    'action', case tg_op when 'INSERT' then 'added' else 'edited' end);
  perform notify(new.trip_id, v_actor, 'balance_change', v_payload, v_affected);
  if tg_op = 'INSERT' then perform notify(new.trip_id, v_actor, 'new_expense', v_payload, null, v_affected); end if;
  return null;
end $$;
create constraint trigger expenses_notify after insert or update of title, amount_minor, paid_by_member_id, expense_date, split_method on expenses
  deferrable initially deferred for each row execute function trg_notify_expense();

create function trg_notify_settlement() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform notify(new.trip_id, new.created_by_member_id, 'settlement_update', jsonb_build_object(
    'actor', member_name(new.created_by_member_id), 'trip', trip_name(new.trip_id), 'kind', new.kind,
    'from', member_name(new.from_member_id), 'to', member_name(new.to_member_id),
    'amount_minor', new.amount_minor, 'currency', new.currency,
    'exponent', (select minor_unit_exponent from currencies where code = new.currency)),
    array[new.from_member_id, new.to_member_id]);
  return null;
end $$;
create trigger settlements_notify after insert on settlements for each row execute function trg_notify_settlement();

create function trg_notify_itinerary() returns trigger language plpgsql security definer set search_path = public as $$
declare v_actor uuid := case tg_op when 'INSERT' then new.created_by_member_id else my_member_id(new.trip_id) end;
begin
  perform notify(new.trip_id, v_actor, 'itinerary_change', jsonb_build_object(
    'actor', member_name(v_actor), 'trip', trip_name(new.trip_id), 'title', new.title, 'day', new.day_date,
    'action', case tg_op when 'INSERT' then 'added' else 'moved' end));
  return null;
end $$;
create trigger itinerary_items_notify_add after insert on itinerary_items for each row execute function trg_notify_itinerary();
create trigger itinerary_items_notify_move after update of day_date on itinerary_items
  for each row when (old.day_date is distinct from new.day_date and new.deleted_at is null) execute function trg_notify_itinerary();

-- Someone joined (by invite) or claimed their guest spot.
create function trg_notify_join() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform notify(new.trip_id, new.id, 'trip_invitation', jsonb_build_object(
    'actor', new.display_name, 'trip', trip_name(new.trip_id), 'action', case tg_op when 'INSERT' then 'joined' else 'claimed' end));
  return null;
end $$;
create trigger trip_members_notify_join after insert on trip_members
  for each row when (new.membership_type = 'registered' and new.role = 'member') execute function trg_notify_join();
create trigger trip_members_notify_claim after update of user_id on trip_members
  for each row when (old.user_id is null and new.user_id is not null) execute function trg_notify_join();

-- Returns true when it marked the caller's own unread notification; anyone else's is left alone.
create function mark_notification_read(p_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  update notifications set read_at = now() where id = p_id and user_id = auth.uid() and read_at is null;
  get diagnostics v_n = row_count;
  return v_n > 0;
end $$;

-- p_trip null sets the user's default for all trips; a trip id overrides it for that trip only.
create function set_notification_preference(p_type notification_type, p_enabled boolean, p_trip uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_trip is not null and not is_trip_member(p_trip) then raise exception 'not a member of this trip' using errcode = '42501'; end if;
  insert into notification_preferences (user_id, trip_id, type, enabled) values (auth.uid(), p_trip, p_type, p_enabled)
  on conflict (user_id, trip_id, type) do update set enabled = excluded.enabled;
end $$;

-- A device token belongs to whoever registered it last (a shared phone changes hands). Sending pushes is a separate Edge Function.
create function register_push_token(p_token text, p_platform text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  insert into push_tokens (user_id, expo_push_token, platform) values (auth.uid(), p_token, p_platform)
  on conflict (expo_push_token) do update set user_id = auth.uid(), platform = excluded.platform, last_seen_at = now();
end $$;

revoke execute on function mark_notification_read, set_notification_preference, register_push_token from public, anon;
grant execute on function mark_notification_read, set_notification_preference, register_push_token to authenticated;

alter publication supabase_realtime add table notifications;
