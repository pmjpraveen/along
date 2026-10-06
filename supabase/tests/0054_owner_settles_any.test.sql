begin;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"full_name":"Cy"}'),
  ('00000000-0000-0000-0000-00000000000d', 'd@example.com', '{"full_name":"Dee"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
create temp table tok as select create_invite((select id from t)) as v;
grant select on t, tok to authenticated;
create temp table asha as select my_member_id((select id from t)) as id;
grant select on asha to authenticated;

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select accept_invite((select v from tok));
create temp table ben as select my_member_id((select id from t)) as id;
grant select on ben to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select accept_invite((select v from tok));
create temp table cy as select my_member_id((select id from t)) as id;
grant select on cy to authenticated;

-- Cy pays 1000 for Ben and Cy (500 each), so Ben owes Cy 500. Neither of them is the organiser.
select create_expense((select id from t), 'Dinner', 1000, '2026-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from ben), 'owed_minor', 500),
  jsonb_build_object('member_id', (select id from cy), 'owed_minor', 500)), 'k-e');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select lives_ok($$ select create_settlement((select id from t), (select id from ben), (select id from cy), 500, 'o1') $$,
  'US-15 the organiser records a payment between two members who both have accounts');
select is((select created_by_member_id from settlements where idempotency_key = 'o1'), (select id from asha), 'US-15 and it shows the organiser recorded it');
select is((select net_minor::int from trip_member_balances where member_id = (select id from ben)), 0, 'US-15 so Ben is settled');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d"}';
select throws_ok($$ select create_settlement((select id from t), (select id from ben), (select id from cy), 100, 'o2', null, null, true) $$, '42501', null, 'US-15 a person outside the trip still cannot record anything');

select * from finish();
rollback;
