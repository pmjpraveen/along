begin;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
create temp table tok as select create_invite((select id from t)) as v;
grant select on t, tok to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select accept_invite((select v from tok));
select lives_ok($$ select create_expense((select id from t), 'Lunch', 1000, '2026-12-03',
  jsonb_build_array(jsonb_build_object('member_id', my_member_id((select id from t)), 'owed_minor', 1000)), 'e1') $$, 'a member adds an expense while the trip is open');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select complete_trip((select id from t));
select lives_ok($$ select create_expense((select id from t), 'Taxi', 500, '2026-12-05',
  jsonb_build_array(jsonb_build_object('member_id', my_member_id((select id from t)), 'owed_minor', 500)), 'e2') $$, 'the owner can still add an expense once the trip is completed');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select throws_ok($$ select create_expense((select id from t), 'Late', 300, '2026-12-05',
  jsonb_build_array(jsonb_build_object('member_id', my_member_id((select id from t)), 'owed_minor', 300)), 'e3') $$, '42501', null, 'a member cannot add an expense to a completed trip');
select is((select count(*)::int from expenses where trip_id = (select id from t)), 2, 'and can still see the expenses that exist');

select * from finish();
rollback;
