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
create temp table split as select jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 500),
  jsonb_build_object('member_id', (select id from ben), 'owed_minor', 500)) as v;
grant select on split to authenticated;

create temp table ex as select (create_expense((select id from t), 'Dinner', 1000, '2026-12-02', (select v from split), 'k-a', (select id from ben))).id as id;
select is((select paid_by_member_id from expenses where id = (select id from ex)), (select id from ben), 'US-06 the selected payer is recorded as payer');
select is((select created_by_member_id from expenses where id = (select id from ex)), (select id from asha), 'US-06 I am recorded as added-by');

select lives_ok($$ select create_expense((select id from t), 'Cab', 1000, '2026-12-02', (select v from split), 'k-b', (select id from guest)) $$, 'US-06 a guest can be the payer');
select is((select paid_by_member_id from expenses where title = 'Cab'), (select id from guest), 'US-06 and is recorded as such');
select lives_ok($$ select create_expense((select id from t), 'Gift', 500, '2026-12-02',
  jsonb_build_array(jsonb_build_object('member_id', (select id from ben), 'owed_minor', 500)), 'k-c', (select id from asha)) $$,
  'US-06 the payer does not have to be in the split');

select throws_ok($$ select create_expense((select id from t), 'Bad', 1000, '2026-12-02', (select v from split), 'k-d',
  (select my_member_id((select id from other_trip)))) $$, '22023', null, 'US-06 a payer from another trip is rejected');

reset role;
update trip_members set status = 'removed', removed_at = now() where id = (select id from ben);
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select throws_ok($$ select create_expense((select id from t), 'Bad', 500, '2026-12-02',
  jsonb_build_array(jsonb_build_object('member_id', (select id from asha), 'owed_minor', 500)), 'k-e', (select id from ben)) $$,
  '22023', null, 'US-06 a removed member cannot be the payer');

select * from finish();
rollback;
