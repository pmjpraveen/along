begin;
select plan(7);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select
  (create_trip('T1', 'X', '2026-12-01', '2026-12-05', 'INR', 'k1')).card_color as c1,
  (create_trip('T2', 'X', '2026-12-01', '2026-12-05', 'INR', 'k2')).card_color as c2,
  (create_trip('T3', 'X', '2026-12-01', '2026-12-05', 'INR', 'k3')).card_color as c3;
grant select on t to authenticated;
select is((select c1 from t), 0::smallint, 'a first trip gets colour 0');
select is((select c2 from t), 1::smallint, 'the next trip gets the next colour, so two trips in a row never match');
select is((select c3 from t), 2::smallint, 'and the one after that the next again');

select lives_ok($$ select create_trip('T4', 'X', '2026-12-01', '2026-12-05', 'INR', 'k4'); select create_trip('T5', 'X', '2026-12-01', '2026-12-05', 'INR', 'k5'); select create_trip('T6', 'X', '2026-12-01', '2026-12-05', 'INR', 'k6') $$, 'six trips can be made');
select is((create_trip('T7', 'X', '2026-12-01', '2026-12-05', 'INR', 'k7')).card_color, 0::smallint, 'the seventh starts the colours over');

select is((select card_color from trips where name = 'T7'), 0::smallint, 'every trip has a colour');
select throws_ok($$ select set_trip_card_color((select id from trips where name = 'T1'), null) $$, '22023', null, 'a colour can be changed but never removed');

select * from finish();
rollback;
