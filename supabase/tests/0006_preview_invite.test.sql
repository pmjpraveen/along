begin;
select plan(8);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa, India', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
create temp table tok as select create_invite((select id from t)) as v;
select add_guest_member((select id from t), 'Rahul');
grant select on t, tok to anon;

set local role anon;
set local request.jwt.claims = '{}';
select is(preview_invite((select v from tok)) ->> 'name', 'Goa', 'US-16b a signed-out visitor sees the trip name');
select is(preview_invite((select v from tok)) ->> 'destination', 'Goa, India', 'US-16b and the destination');
select is((preview_invite((select v from tok)) ->> 'participant_count')::int, 2, 'US-16b and how many people are in');
select is(array(select jsonb_object_keys(preview_invite((select v from tok))) order by 1),
  array['destination', 'end_date', 'name', 'participant_count', 'start_date'], 'US-16b preview exposes nothing beyond name, destination, dates, count');
select throws_ok($$ select preview_invite('nope') $$, 'P0001', 'invite_not_found', 'US-16b unknown token rejected');

reset role;
update trip_invites set expires_at = now() - interval '1 minute';
set local role anon;
select throws_ok($$ select preview_invite((select v from tok)) $$, 'P0001', 'invite_expired', 'US-16b expired invite rejected');
reset role;
update trip_invites set expires_at = null, status = 'revoked';
set local role anon;
select throws_ok($$ select preview_invite((select v from tok)) $$, 'P0001', 'invite_revoked', 'US-16b revoked invite rejected');
select is((select count(*)::int from trips), 0, 'US-16b anon cannot read trips directly');

select * from finish();
rollback;
