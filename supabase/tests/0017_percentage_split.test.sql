begin;
select plan(6);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
grant select on t to authenticated;
create temp table asha as select my_member_id((select id from t)) as id;
create temp table guest as select (add_guest_member((select id from t), 'Rahul')).id as id;
grant select on asha, guest to authenticated;

create temp table ex as select (create_expense((select id from t), 'Hotel', 10001, '2026-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 6001, 'split_value', 6000),
  jsonb_build_object('member_id', (select id from guest), 'owed_minor', 4000, 'split_value', 4000)), 'k-a', null, 'percentage')).id as id;
grant select on ex to authenticated;
select is((select split_method::text from expenses where id = (select id from ex)), 'percentage', 'US-09 the percentage method is recorded');
select is((select split_value::int from expense_participants where expense_id = (select id from ex) and trip_member_id = (select id from asha)), 6000,
  'US-09 each percentage is saved (basis points)');
select is((select sum(owed_amount_minor)::int from expense_participants where expense_id = (select id from ex)), 10001, 'US-09 the calculated shares sum to the total');

select throws_ok($$ select create_expense((select id from t), 'Bad', 10000, '2026-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 5000, 'split_value', 5000),
  jsonb_build_object('member_id', (select id from guest), 'owed_minor', 5000, 'split_value', 4999)), 'k-b', null, 'percentage') $$,
  '22023', 'percentages_must_total_100', 'US-09 percentages that do not total 100% are rejected');
select throws_ok($$ select create_expense((select id from t), 'Bad', 10000, '2026-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 10000)), 'k-c', null, 'percentage') $$,
  '22023', 'percentages_must_total_100', 'US-09 a percentage split without percentages is rejected');
select is((select count(*)::int from expenses), 1, 'US-09 and nothing is saved for the rejects');

select * from finish();
rollback;
