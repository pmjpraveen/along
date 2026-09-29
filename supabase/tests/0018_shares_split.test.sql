begin;
select plan(5);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
grant select on t to authenticated;
create temp table asha as select my_member_id((select id from t)) as id;
create temp table guest as select (add_guest_member((select id from t), 'Rahul')).id as id;
grant select on asha, guest to authenticated;

-- 3 nights vs 1 night of 10001: 7501 / 2500 (largest remainder)
create temp table ex as select (create_expense((select id from t), 'Hotel', 10001, '2026-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 7501, 'split_value', 3),
  jsonb_build_object('member_id', (select id from guest), 'owed_minor', 2500, 'split_value', 1)), 'k-a', null, 'shares')).id as id;
select is((select split_method::text from expenses where id = (select id from ex)), 'shares', '5.3 the shares method is recorded');
select is((select split_value::int from expense_participants where expense_id = (select id from ex) and trip_member_id = (select id from asha)), 3,
  '5.3 each person''s shares are saved');
select is((select sum(owed_amount_minor)::int from expense_participants where expense_id = (select id from ex)), 10001, '5.3 the proportional shares sum to the total');

select throws_ok($$ select create_expense((select id from t), 'Bad', 1000, '2026-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 1000, 'split_value', 0)), 'k-b', null, 'shares') $$,
  '22023', 'shares_must_be_positive', '5.3 a zero share is rejected');
select throws_ok($$ select create_expense((select id from t), 'Bad', 1000, '2026-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 1000)), 'k-c', null, 'shares') $$,
  '22023', 'shares_must_be_positive', '5.3 shares without values are rejected');

select * from finish();
rollback;
