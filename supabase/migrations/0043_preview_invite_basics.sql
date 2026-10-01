-- The invite preview is what someone sees before they join: only basic info (name, place, dates, how many are going), now also the
-- trip's card colour and who invited them. Everything else (plans, expenses, who is on it, memories) stays behind membership.
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
    'card_color', v_trip.card_color,
    'invited_by', (select display_name from trip_members where id = v_inv.created_by_member_id),
    'participant_count', (select count(*) from trip_members where trip_id = v_trip.id and status = 'active'))
    || case when v_inv.claims_member_id is null then '{}'::jsonb
       else jsonb_build_object('claims_name', (select display_name from trip_members where id = v_inv.claims_member_id)) end;
end $$;
revoke execute on function preview_invite from public;
grant execute on function preview_invite to anon, authenticated;
