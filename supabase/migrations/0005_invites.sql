create type invite_status as enum ('active', 'revoked', 'expired', 'exhausted');

create table trip_invites (
  id                    uuid primary key default gen_random_uuid(),
  trip_id               uuid not null references trips (id) on delete cascade,
  token_hash            text not null unique,              -- sha-256 hex; the token is shown once
  created_by_member_id  uuid not null,
  claims_member_id      uuid,                              -- optional: link that claims one guest (later story)
  expires_at            timestamptz,
  max_uses              int check (max_uses is null or max_uses > 0),
  uses                  int not null default 0 check (uses >= 0),
  status                invite_status not null default 'active',
  created_at            timestamptz not null default now(),
  foreign key (created_by_member_id, trip_id) references trip_members (id, trip_id),
  foreign key (claims_member_id, trip_id)     references trip_members (id, trip_id),
  check (max_uses is null or uses <= max_uses)
);
create index trip_invites_live on trip_invites (trip_id) where status = 'active';
-- RPC only: RLS on, no policies, no client privileges.
alter table trip_invites enable row level security;
revoke all on trip_invites from authenticated, anon;

create function invite_hash(p_token text) returns text
language sql immutable as $$ select encode(sha256(convert_to(p_token, 'utf8')), 'hex') $$;

-- Returns the token once; only its hash is stored. Default expiry is 7 days.
create function create_invite(p_trip uuid, p_expires_at timestamptz default null, p_max_uses int default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_trip_owner(p_trip) then raise exception 'only the owner can invite' using errcode = '42501'; end if;
  insert into trip_invites (trip_id, token_hash, created_by_member_id, expires_at, max_uses)
  values (p_trip, invite_hash(v_token), my_member_id(p_trip), coalesce(p_expires_at, now() + interval '7 days'), p_max_uses);
  return v_token;
end $$;

-- Joining twice is a no-op: the live-membership unique index and this early return keep one row and one use.
create function accept_invite(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_inv trip_invites;
  v_user users;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select i.* into v_inv from trip_invites i
    join trips t on t.id = i.trip_id and t.deleted_at is null
    where i.token_hash = invite_hash(coalesce(p_token, '')) for update of i;
  if not found then raise exception 'invite_not_found' using errcode = 'P0001'; end if;
  if is_trip_member(v_inv.trip_id) then return v_inv.trip_id; end if;
  if v_inv.status = 'revoked' then raise exception 'invite_revoked' using errcode = 'P0001'; end if;
  if v_inv.status = 'exhausted' or v_inv.max_uses is not null and v_inv.uses >= v_inv.max_uses then
    raise exception 'invite_exhausted' using errcode = 'P0001';
  end if;
  if v_inv.status = 'expired' or v_inv.expires_at is not null and v_inv.expires_at <= now() then
    raise exception 'invite_expired' using errcode = 'P0001';
  end if;

  select * into v_user from users where id = v_uid;
  insert into trip_members (trip_id, user_id, display_name, avatar_url, membership_type, role, status, invited_by_member_id, joined_at)
  values (v_inv.trip_id, v_uid, v_user.display_name, v_user.avatar_url, 'registered', 'member', 'active', v_inv.created_by_member_id, now());
  update trip_invites set uses = uses + 1,
    status = case when max_uses is not null and uses + 1 >= max_uses then 'exhausted' else status end
    where id = v_inv.id;
  return v_inv.trip_id;
end $$;

revoke execute on function invite_hash, create_invite, accept_invite from public, anon;
grant execute on function create_invite, accept_invite to authenticated;
