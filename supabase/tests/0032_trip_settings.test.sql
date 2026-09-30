begin;
select plan(10);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"full_name":"Cy"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
create temp table t2 as select (create_trip('Ooty', 'Ooty', '2026-12-01', '2026-12-05', 'INR', 'k2')).id as id;
create temp table tok as select create_invite((select id from t)) as v;
grant select on t, t2, tok to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select accept_invite((select v from tok));

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select is((update_trip_dates((select id from t), '2026-12-02', '2026-12-09')).end_date, '2026-12-09'::date, 'the owner can change the dates');
select throws_ok($$ select update_trip_dates((select id from t), '2026-12-09', '2026-12-02') $$, '23514', null, 'the end cannot be before the start');
select is((set_trip_currency((select id from t), 'USD')).primary_currency::text, 'USD', 'the owner can change the currency while there are no expenses');
select throws_ok($$ select set_trip_currency((select id from t), 'XXX') $$, '22023', null, 'an unknown currency is refused');

select lives_ok($$ select create_expense((select id from t), 'Lunch', 1000, '2026-12-03',
  jsonb_build_array(jsonb_build_object('member_id', my_member_id((select id from t)), 'owed_minor', 1000)), 'e1') $$, 'an expense is added');
select throws_ok($$ select set_trip_currency((select id from t), 'EUR') $$, '55000', 'currency_locked', 'the currency is locked once there are expenses');
select is((update_trip_dates((select id from t), '2026-12-03', '2026-12-10')).start_date, '2026-12-03'::date, 'but the dates can still change');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select throws_ok($$ select update_trip_dates((select id from t), '2026-12-01', '2026-12-05') $$, '42501', null, 'a member who is not the owner cannot change the dates');
select throws_ok($$ select set_trip_currency((select id from t2), 'USD') $$, '42501', null, 'and cannot change the currency of another trip');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select complete_trip((select id from t2));
select throws_ok($$ select update_trip_dates((select id from t2), '2026-12-01', '2026-12-06') $$, '55000', null, 'a completed trip cannot be changed');

select * from finish();
rollback;
