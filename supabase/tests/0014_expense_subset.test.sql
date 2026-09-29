begin;
select plan(7);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"full_name":"Cy"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
create temp table other_trip as select (create_trip('Elsewhere', 'X', '2026-12-01', '2026-12-05', 'INR', 'k2')).id as id;
create temp table tok as select create_invite((select id from t)) as v;
grant select on t, other_trip, tok to authenticated;
create temp table asha as select my_member_id((select id from t)) as id;
create temp table guest as select (add_guest_member((select id from t), 'Rahul')).id as id;
grant select on asha, guest to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select accept_invite((select v from tok));
create temp table ben as select my_member_id((select id from t)) as id;
grant select on ben to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';

create temp table ex as select (create_expense((select id from t), 'Dinner', 1001, '2026-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from ben), 'owed_minor', 501),
  jsonb_build_object('member_id', (select id from guest), 'owed_minor', 500)), 'k-a')).id as id;

select is((select count(*)::int from expense_participants where expense_id = (select id from ex)), 2, 'US-07 only the selected subset gets a liability row');
select is((select count(*)::int from expense_participants where expense_id = (select id from ex) and trip_member_id = (select id from asha)), 0,
  'US-07 an unselected member (even the payer) owes nothing');
select ok(exists (select 1 from expense_participants where expense_id = (select id from ex) and trip_member_id = (select id from guest)),
  'US-07 a guest can be in the split');
select is((select sum(owed_amount_minor)::int from expense_participants where expense_id = (select id from ex)), 1001, 'US-07 the subset split still sums to the total');

select lives_ok($$ select create_expense((select id from t), 'Mine', 700, '2026-12-02',
  jsonb_build_array(jsonb_build_object('member_id', (select id from asha), 'owed_minor', 700)), 'k-b') $$, 'US-07 a payer-only split is valid');
select throws_ok($$ select create_expense((select id from t), 'Bad', 500, '2026-12-02',
  jsonb_build_array(jsonb_build_object('member_id', (select my_member_id((select id from other_trip))), 'owed_minor', 500)), 'k-c') $$,
  '22023', null, 'US-07 someone from another trip cannot be in the split');
select throws_ok($$ select create_expense((select id from t), 'Bad', 500, '2026-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from ben), 'owed_minor', 250), jsonb_build_object('member_id', (select id from ben), 'owed_minor', 250)), 'k-d') $$,
  '22023', null, 'US-07 the same person twice is rejected');

select * from finish();
rollback;
