begin;
select plan(11);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"full_name":"Cy"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
create temp table tok as select create_invite((select id from t)) as v;
grant select on t, tok to authenticated;

select lives_ok($$ select create_itinerary_item((select id from t), '  Beach day ', 'activity', '2026-12-02') $$, 'US-03 a valid item saves');
select is((select day_date::text || '/' || title from itinerary_items), '2026-12-02/Beach day', 'US-03 it lands on the chosen date with a trimmed title');
select is((select time_mode::text from itinerary_items), 'none', 'US-03 no time means time_mode none');
select lives_ok($$ select create_itinerary_item((select id from t), 'Dinner', 'restaurant', '2026-12-02', '19:30', '21:00') $$, 'US-03 a timed item saves');
select is((select time_mode::text from itinerary_items where title = 'Dinner'), 'range', 'US-03 start and end make a range');
select lives_ok($$ select create_itinerary_item((select id from t), 'Airport', 'transport', '2026-11-30') $$, 'US-03 an item outside the trip dates is kept');
select ok((select is_outside_trip_range from itinerary_items_flagged where title = 'Airport'), 'US-03 and flagged as outside the trip range');
select throws_ok($$ select create_itinerary_item((select id from t), '   ', 'activity', '2026-12-02') $$, '23514', null, 'US-03 blank title rejected');
select throws_ok($$ select create_itinerary_item((select id from t), 'Bad', 'activity', '2026-12-02', '21:00', '19:00') $$, '23514', null, 'US-03 end before start rejected');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select throws_ok($$ select create_itinerary_item((select id from t), 'Sneaky', 'activity', '2026-12-02') $$, '42501', null, 'US-03 a non-member cannot add items');
select is((select count(*)::int from itinerary_items), 0, 'US-03 a non-member cannot see the trip items');

select * from finish();
rollback;
