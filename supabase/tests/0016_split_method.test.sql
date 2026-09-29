begin;
select plan(7);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
create temp table tok as select create_invite((select id from t)) as v;
grant select on t, tok to authenticated;
create temp table asha as select my_member_id((select id from t)) as id;
create temp table guest as select (add_guest_member((select id from t), 'Rahul')).id as id;
grant select on asha, guest to authenticated;

create temp table ex as select (create_expense((select id from t), 'Hotel', 10000, '2026-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 7000, 'split_value', 7000),
  jsonb_build_object('member_id', (select id from guest), 'owed_minor', 3000, 'split_value', 3000)), 'k-a', null, 'custom')).id as id;
grant select on ex to authenticated;
select is((select split_method::text from expenses where id = (select id from ex)), 'custom', 'US-08 the split method is recorded');
select is((select owed_amount_minor::int from expense_participants where expense_id = (select id from ex) and trip_member_id = (select id from asha)), 7000,
  'US-08 each custom amount is saved as that person''s share');
select is((select split_value::int from expense_participants where expense_id = (select id from ex) and trip_member_id = (select id from guest)), 3000,
  'US-08 the entered value is kept');
select is((select net_minor::int from trip_member_balances where member_id = (select id from guest)), -3000, 'US-08 balances follow the custom shares');

select throws_ok($$ select create_expense((select id from t), 'Bad', 10000, '2026-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 7000, 'split_value', 7000),
  jsonb_build_object('member_id', (select id from guest), 'owed_minor', 2999, 'split_value', 2999)), 'k-b', null, 'custom') $$,
  '22023', 'split_must_sum', 'US-08 custom amounts that do not equal the total are rejected');
select is((select count(*)::int from expenses), 1, 'US-08 and nothing is saved');

select is((select split_method::text from create_expense((select id from t), 'Lunch', 1000, '2026-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 1000)), 'k-c')), 'equal', 'US-08 the method still defaults to equal');

select * from finish();
rollback;
