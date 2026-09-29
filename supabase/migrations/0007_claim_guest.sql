alter table trip_invites add constraint claim_invite_single_use check (claims_member_id is null or max_uses = 1);

-- Shared invite validation; locks the invite row for the caller's transaction.
create function usable_invite(p_token text) returns trip_invites
language plpgsql security definer set search_path = public as $$
declare v_inv trip_invites;
begin
  select i.* into v_inv from trip_invites i
    join trips t on t.id = i.trip_id and t.deleted_at is null
    where i.token_hash = invite_hash(coalesce(p_token, '')) for update of i;
  if not found then raise exception 'invite_not_found' using errcode = 'P0001'; end if;
  if v_inv.status = 'revoked' then raise exception 'invite_revoked' using errcode = 'P0001'; end if;
  if v_inv.status = 'exhausted' or v_inv.max_uses is not null and v_inv.uses >= v_inv.max_uses then
    raise exception 'invite_exhausted' using errcode = 'P0001';
  end if;
  if v_inv.status = 'expired' or v_inv.expires_at is not null and v_inv.expires_at <= now() then
    raise exception 'invite_expired' using errcode = 'P0001';
  end if;
  return v_inv;
end $$;

-- A claim link (p_claims_member) is single-use and names one unclaimed guest.
drop function create_invite(uuid, timestamptz, int);
create function create_invite(p_trip uuid, p_expires_at timestamptz default null, p_max_uses int default null, p_claims_member uuid default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_trip_owner(p_trip) then raise exception 'only the owner can invite' using errcode = '42501'; end if;
  if p_claims_member is not null and not exists (
      select 1 from trip_members where id = p_claims_member and trip_id = p_trip
        and membership_type = 'guest' and user_id is null and status = 'active') then
    raise exception 'not_an_unclaimed_guest' using errcode = '22023';
  end if;
  insert into trip_invites (trip_id, token_hash, created_by_member_id, expires_at, max_uses, claims_member_id)
  values (p_trip, invite_hash(v_token), my_member_id(p_trip), coalesce(p_expires_at, now() + interval '7 days'),
          case when p_claims_member is null then p_max_uses else 1 end, p_claims_member);
  return v_token;
end $$;

-- A claim link must go through claim_guest_profile so nobody joins as a duplicate of a guest.
create or replace function accept_invite(p_token text) returns uuid
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
  v_inv := usable_invite(p_token);
  if v_inv.claims_member_id is not null then raise exception 'invite_claim_required' using errcode = 'P0001'; end if;

  select * into v_user from users where id = v_uid;
  insert into trip_members (trip_id, user_id, display_name, avatar_url, membership_type, role, status, invited_by_member_id, joined_at)
  values (v_inv.trip_id, v_uid, v_user.display_name, v_user.avatar_url, 'registered', 'member', 'active', v_inv.created_by_member_id, now());
  update trip_invites set uses = uses + 1,
    status = case when max_uses is not null and uses + 1 >= max_uses then 'exhausted' else status end
    where id = v_inv.id;
  return v_inv.trip_id;
end $$;

create or replace function preview_invite(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_inv trip_invites := usable_invite(p_token);
  v_trip trips;
begin
  select * into v_trip from trips where id = v_inv.trip_id;
  return jsonb_build_object(
    'name', v_trip.name,
    'destination', v_trip.destination_name,
    'start_date', v_trip.start_date,
    'end_date', v_trip.end_date,
    'participant_count', (select count(*) from trip_members where trip_id = v_trip.id and status = 'active'))
    || case when v_inv.claims_member_id is null then '{}'::jsonb
       else jsonb_build_object('claims_name', (select display_name from trip_members where id = v_inv.claims_member_id)) end;
end $$;

-- One guarded update: the guest row becomes the caller's, so every expense, split and settlement that
-- points at it now belongs to their account. Nothing is copied or merged by name.
create function claim_guest_profile(p_token text, p_confirm boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_inv trip_invites;
  v_member trip_members;
  v_user users;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_confirm is not true then raise exception 'confirmation_required' using errcode = 'P0001'; end if;

  select i.* into v_inv from trip_invites i
    where i.token_hash = invite_hash(coalesce(p_token, '')) and i.claims_member_id is not null for update;
  if not found then raise exception 'invite_not_found' using errcode = 'P0001'; end if;

  select * into v_member from trip_members where id = v_inv.claims_member_id;
  if v_member.user_id = v_uid then return v_inv.trip_id; end if;            -- retry: already mine
  if v_member.user_id is not null then raise exception 'guest_already_claimed' using errcode = 'P0001'; end if;
  v_inv := usable_invite(p_token);
  if is_trip_member(v_inv.trip_id) then raise exception 'already_member' using errcode = 'P0001'; end if;

  select * into v_user from users where id = v_uid;
  update trip_members set user_id = v_uid, membership_type = 'registered', role = 'member',
         avatar_url = v_user.avatar_url, claimed_at = now(), joined_at = now()
    where id = v_inv.claims_member_id and user_id is null;
  update trip_invites set uses = uses + 1, status = 'exhausted' where id = v_inv.id;
  return v_inv.trip_id;
exception when unique_violation then
  raise exception 'already_member' using errcode = 'P0001';
end $$;

revoke execute on function usable_invite, create_invite, claim_guest_profile from public, anon;
grant execute on function create_invite, claim_guest_profile to authenticated;
grant execute on function preview_invite to anon, authenticated;
