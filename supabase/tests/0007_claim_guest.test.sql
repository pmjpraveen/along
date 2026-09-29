begin;
select plan(12);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Rahul"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"full_name":"Cy"}'),
  ('00000000-0000-0000-0000-00000000000d', 'd@example.com', '{"full_name":"Dee"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
create temp table g as select (add_guest_member((select id from t), 'Rahul')).id as id;
create temp table tok as select create_invite((select id from t), null, null, (select id from g)) as v;
create temp table tok2 as select create_invite((select id from t), null, null, (select id from g)) as v;
create temp table plain as select create_invite((select id from t)) as v;
grant select on t, g, tok, tok2, plain to authenticated, anon;

select throws_ok($$ select create_invite((select id from t), null, null, (select id from t)) $$, '22023', null,
  'US-17 a claim link must name an unclaimed guest');

set local role anon;
set local request.jwt.claims = '{}';
select is(preview_invite((select v from tok)) ->> 'claims_name', 'Rahul', 'US-17 the claim preview names the guest');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select throws_ok($$ select accept_invite((select v from tok)) $$, 'P0001', 'invite_claim_required',
  'US-17 a claim link cannot be used to join as a duplicate');
select throws_ok($$ select claim_guest_profile((select v from tok), false) $$, 'P0001', 'confirmation_required',
  'US-17 claiming needs explicit confirmation');
select is(claim_guest_profile((select v from tok), true), (select id from t), 'US-17 a confirmed claim succeeds');
select is((select user_id from trip_members where id = (select id from g)), auth.uid(), 'US-17 the guest row now belongs to my account');
select is((select count(*)::int from trip_members where trip_id = (select id from t)), 2, 'US-17 claiming adds no duplicate participant');
select is((select membership_type::text || '/' || role::text from trip_members where id = (select id from g)), 'registered/member',
  'US-17 the claimed row becomes a registered member');
select lives_ok($$ select claim_guest_profile((select v from tok), true) $$, 'US-17 claiming twice is idempotent');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select throws_ok($$ select claim_guest_profile((select v from tok), true) $$, 'P0001', 'guest_already_claimed',
  'US-17 someone else cannot claim an already claimed guest');

-- a member who is already in the trip cannot claim a second identity
reset role;
insert into trip_members (trip_id, user_id, display_name, membership_type, role, status, joined_at)
  select id, '00000000-0000-0000-0000-00000000000d', 'Dee', 'registered', 'member', 'active', now() from t;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table g2 as select (add_guest_member((select id from t), 'Rahul')).id as id;
create temp table tok3 as select create_invite((select id from t), null, null, (select id from g2)) as v;
grant select on tok3 to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d"}';
select throws_ok($$ select claim_guest_profile((select v from tok3), true) $$, 'P0001', 'already_member',
  'US-17 an existing member gets an explicit conflict instead of a merge');
select is((select user_id from trip_members where id = (select id from g2)), null, 'US-17 the guest stays unclaimed after the conflict');

select * from finish();
rollback;
