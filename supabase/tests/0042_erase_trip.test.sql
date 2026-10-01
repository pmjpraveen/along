begin;
select plan(8);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
create temp table t2 as select (create_trip('Ooty', 'Ooty', '2026-12-01', '2026-12-05', 'INR', 'k2')).id as id;
create temp table tok as select create_invite((select id from t)) as v;
grant select on t, t2, tok to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select accept_invite((select v from tok));
select create_expense((select id from t), 'Lunch', 1000, '2026-12-03',
  jsonb_build_array(jsonb_build_object('member_id', my_member_id((select id from t)), 'owed_minor', 1000)), 'e1',
  (select id from trip_members where trip_id = (select id from t) and role = 'owner'));
select create_settlement((select id from t), my_member_id((select id from t)), (select id from trip_members where trip_id = (select id from t) and role = 'owner'), 300, 'sk-1');

select throws_ok($$ select delete_trip((select id from t)) $$, '42501', null, 'a member who is not the owner cannot erase the trip');
select throws_ok($$ delete from settlements where trip_id = (select id from t) $$, '42501', null, 'payments still cannot be deleted directly');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select lives_ok($$ select delete_trip((select id from t)) $$, 'the owner can erase the trip, payments included');
reset role;
select is((select count(*)::int from trips where id = (select id from t)), 0, 'the trip row is gone');
select is((select count(*)::int from expenses where trip_id = (select id from t)), 0, 'its expenses are gone');
select is((select count(*)::int from settlements where trip_id = (select id from t)), 0, 'its payments are gone');
select is((select count(*)::int from trip_members where trip_id = (select id from t)), 0, 'its members are gone');
select is((select count(*)::int from trips where id = (select id from t2)), 1, 'another trip is untouched');

select * from finish();
rollback;
