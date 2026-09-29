create type trip_status     as enum ('draft', 'published', 'completed', 'archived');
create type membership_type as enum ('registered', 'guest');
create type member_role     as enum ('owner', 'member', 'guest');
create type member_status   as enum ('invited', 'active', 'removed');

create table currencies (
  code                 char(3)  primary key,
  name                 text     not null,
  minor_unit_exponent  smallint not null check (minor_unit_exponent between 0 and 4)
);
insert into currencies (code, name, minor_unit_exponent) values
  ('INR', 'Indian rupee', 2), ('USD', 'US dollar', 2), ('EUR', 'Euro', 2),
  ('GBP', 'Pound sterling', 2), ('JPY', 'Japanese yen', 0), ('KWD', 'Kuwaiti dinar', 3);
alter table currencies enable row level security;
create policy currencies_select on currencies for select to authenticated using (true);
revoke insert, update, delete on currencies from authenticated, anon;

create function bump_version() returns trigger language plpgsql as $$
begin new.updated_at := now(); new.version := old.version + 1; return new; end $$;

create table trips (
  id                    uuid primary key default gen_random_uuid(),
  created_by_user_id    uuid not null references users (id),
  name                  text not null check (length(trim(name)) > 0),
  destination_name      text not null,
  destination_place_id  text,
  start_date            date not null,
  end_date              date not null,
  timezone              text not null default 'UTC',
  primary_currency      char(3) not null references currencies (code),
  cover_url             text,
  description           text,
  status                trip_status not null default 'published',
  completed_at          timestamptz,
  idempotency_key       text,
  version               int not null default 1,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,
  constraint trips_dates_valid check (end_date >= start_date),
  constraint trips_completed_consistent check ((status in ('completed', 'archived')) = (completed_at is not null))
);
create unique index trips_idempotency on trips (created_by_user_id, idempotency_key)
  where idempotency_key is not null;
create trigger trips_version before update on trips
  for each row execute function bump_version();

create table trip_members (
  id                    uuid primary key default gen_random_uuid(),
  trip_id               uuid not null references trips (id) on delete cascade,
  user_id               uuid references users (id),
  display_name          text not null,
  avatar_url            text,
  membership_type       membership_type not null,
  role                  member_role not null,
  status                member_status not null default 'active',
  invited_by_member_id  uuid references trip_members (id),
  joined_at             timestamptz,
  claimed_at            timestamptz,
  removed_at            timestamptz,
  version               int not null default 1,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint trip_members_id_trip unique (id, trip_id),
  constraint members_guest_iff_no_user check ((membership_type = 'guest') = (user_id is null)),
  constraint members_guest_iff_guest_role check ((membership_type = 'guest') = (role = 'guest')),
  constraint members_removed_consistent check ((status = 'removed') = (removed_at is not null))
);
create unique index trip_members_one_live_user on trip_members (trip_id, user_id)
  where user_id is not null and status <> 'removed';
create unique index trip_members_one_owner on trip_members (trip_id)
  where role = 'owner' and status = 'active';
create index trip_members_active_by_user on trip_members (user_id, trip_id) where status = 'active';
create index trip_members_by_trip on trip_members (trip_id, status);
create trigger trip_members_version before update on trip_members
  for each row execute function bump_version();

create function trg_require_owner() returns trigger language plpgsql as $$
begin
  if exists (select 1 from trips t where t.id = new.trip_id and t.deleted_at is null)
     and not exists (select 1 from trip_members m
                     where m.trip_id = new.trip_id and m.role = 'owner' and m.status = 'active') then
    raise exception 'trip % must keep one active owner', new.trip_id using errcode = '23514';
  end if;
  return null;
end $$;
create constraint trigger trip_members_keep_owner
  after insert or update of role, status on trip_members
  deferrable initially deferred for each row execute function trg_require_owner();

-- security definer so the membership check does not recurse into the trip_members policy
create function my_member_id(p_trip uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select m.id from trip_members m
  where m.trip_id = p_trip and m.user_id = auth.uid() and m.status = 'active'
  limit 1
$$;
create function is_trip_member(p_trip uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select my_member_id(p_trip) is not null
$$;

alter table trips enable row level security;
alter table trip_members enable row level security;
create policy trips_select on trips for select to authenticated
  using (deleted_at is null and is_trip_member(id));
create policy trip_members_select on trip_members for select to authenticated
  using (is_trip_member(trip_id));
revoke insert, update, delete on trips, trip_members from authenticated, anon;

-- A retry with the same key returns the trip already created instead of a second one.
create function create_trip(
  p_name text, p_destination text, p_start date, p_end date,
  p_currency char(3), p_idempotency_key text
) returns trips
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_trip trips;
  v_user users;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'idempotency key required' using errcode = '22023';
  end if;

  insert into trips (created_by_user_id, name, destination_name, start_date, end_date, primary_currency, idempotency_key)
  values (v_uid, trim(p_name), trim(p_destination), p_start, p_end, p_currency, p_idempotency_key)
  on conflict (created_by_user_id, idempotency_key) where idempotency_key is not null do nothing
  returning * into v_trip;

  if v_trip.id is null then
    select * into v_trip from trips where created_by_user_id = v_uid and idempotency_key = p_idempotency_key;
    return v_trip;
  end if;

  select * into v_user from users where id = v_uid;
  insert into trip_members (trip_id, user_id, display_name, avatar_url, membership_type, role, status, joined_at)
  values (v_trip.id, v_uid, v_user.display_name, v_user.avatar_url, 'registered', 'owner', 'active', now());
  return v_trip;
end $$;
revoke execute on function create_trip from public, anon;
grant execute on function create_trip to authenticated;
