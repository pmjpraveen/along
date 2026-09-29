-- Token-gated and callable before sign-in: returns only name, destination, dates and a headcount.
-- No people, no money, no ids.
create function preview_invite(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_inv trip_invites;
  v_trip trips;
begin
  select i.* into v_inv from trip_invites i where i.token_hash = invite_hash(coalesce(p_token, ''));
  if not found then raise exception 'invite_not_found' using errcode = 'P0001'; end if;
  select * into v_trip from trips where id = v_inv.trip_id and deleted_at is null;
  if not found then raise exception 'invite_not_found' using errcode = 'P0001'; end if;
  if v_inv.status = 'revoked' then raise exception 'invite_revoked' using errcode = 'P0001'; end if;
  if v_inv.status = 'exhausted' or v_inv.max_uses is not null and v_inv.uses >= v_inv.max_uses then
    raise exception 'invite_exhausted' using errcode = 'P0001';
  end if;
  if v_inv.status = 'expired' or v_inv.expires_at is not null and v_inv.expires_at <= now() then
    raise exception 'invite_expired' using errcode = 'P0001';
  end if;
  return jsonb_build_object(
    'name', v_trip.name,
    'destination', v_trip.destination_name,
    'start_date', v_trip.start_date,
    'end_date', v_trip.end_date,
    'participant_count', (select count(*) from trip_members where trip_id = v_trip.id and status = 'active'));
end $$;
revoke execute on function preview_invite from public;
grant execute on function preview_invite to anon, authenticated;
