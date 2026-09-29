-- A lightweight, member-readable log of what changed in a trip: joins, itinerary additions and new expenses.
-- Not a social feed (no reactions, no comments) and not the audit trail (no before/after images).
create table activity_events (
  id               uuid primary key default gen_random_uuid(),
  trip_id          uuid not null references trips (id) on delete cascade,
  actor_member_id  uuid,
  entity_type      text not null,                         -- 'expense', 'itinerary_item', 'member'
  entity_id        uuid not null,
  action           text not null,                         -- 'created', 'joined', 'claimed', 'guest_added'
  summary          jsonb not null default '{}',           -- display fields only (title, amount)
  created_at       timestamptz not null default now(),
  foreign key (actor_member_id, trip_id) references trip_members (id, trip_id)
);
create index activity_events_feed on activity_events (trip_id, created_at desc);

alter table activity_events enable row level security;
create policy activity_events_select on activity_events for select to authenticated using (is_trip_member(trip_id));
revoke insert, update, delete on activity_events from authenticated, anon;

create function trg_feed_expense() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into activity_events (trip_id, actor_member_id, entity_type, entity_id, action, summary)
  values (new.trip_id, new.created_by_member_id, 'expense', new.id, 'created', jsonb_build_object(
    'title', new.title, 'amount_minor', new.amount_minor, 'currency', new.currency,
    'exponent', (select minor_unit_exponent from currencies where code = new.currency),
    'paid_by', member_name(new.paid_by_member_id)));
  return null;
end $$;
create trigger expenses_feed after insert on expenses for each row execute function trg_feed_expense();

create function trg_feed_itinerary() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into activity_events (trip_id, actor_member_id, entity_type, entity_id, action, summary)
  values (new.trip_id, new.created_by_member_id, 'itinerary_item', new.id, 'created', jsonb_build_object('title', new.title, 'day', new.day_date));
  return null;
end $$;
create trigger itinerary_items_feed after insert on itinerary_items for each row execute function trg_feed_itinerary();

-- A registered person joining, a guest being added by someone, and a guest claiming their spot. The trip creator's own
-- owner row is not "joining", so it is skipped.
create function trg_feed_member() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into activity_events (trip_id, actor_member_id, entity_type, entity_id, action, summary)
  values (new.trip_id,
          case when new.membership_type = 'guest' then new.invited_by_member_id else new.id end,
          'member', new.id,
          case when tg_op = 'UPDATE' then 'claimed' when new.membership_type = 'guest' then 'guest_added' else 'joined' end,
          jsonb_build_object('name', new.display_name));
  return null;
end $$;
create trigger trip_members_feed_add after insert on trip_members
  for each row when (new.role <> 'owner') execute function trg_feed_member();
create trigger trip_members_feed_claim after update of user_id on trip_members
  for each row when (old.user_id is null and new.user_id is not null) execute function trg_feed_member();

alter publication supabase_realtime add table activity_events;
