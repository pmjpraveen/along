begin;
select plan(11);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
grant select on t to authenticated;

select lives_ok($$ select create_itinerary_item((select id from t), 'Dinner', 'restaurant', '2026-12-02', null, null, '{}',
  'https://maps.app.goo.gl/abc', 'https://maps.app.goo.gl/abc', 15.5, 73.8, 'Fish Curry Place') $$, '3.3 a resolved Maps link saves');
select is((select latitude::text || ',' || longitude::text || ',' || formatted_address from itinerary_items where title = 'Dinner'),
  '15.500000,73.800000,Fish Curry Place', '3.3 coordinates and place name are stored');
select is((select location_text from itinerary_items where title = 'Dinner'), 'https://maps.app.goo.gl/abc', '3.3 the raw text is kept');

select lives_ok($$ select create_itinerary_item((select id from t), 'Unresolved', 'place', '2026-12-02', null, null, '{}',
  'https://maps.app.goo.gl/zzz', 'https://maps.app.goo.gl/zzz') $$, '3.3 a link that did not resolve is still saved');
select is((select latitude from itinerary_items where title = 'Unresolved'), null, '3.3 and has no coordinates');

select throws_ok($$ select create_itinerary_item((select id from t), 'Bad', 'place', '2026-12-02', null, null, '{}', null, null, 15.5, null) $$,
  '22023', null, '3.3 half a coordinate pair is rejected');
select throws_ok($$ select create_itinerary_item((select id from t), 'Bad', 'place', '2026-12-02', null, null, '{}', null, null, 95, 10) $$,
  '22023', null, '3.3 out-of-range coordinates are rejected');

select lives_ok($$ select create_itinerary_item((select id from t), 'Lunch', 'restaurant', '2026-12-02', null, null, '{}', '  Fish Curry Place,  Goa ') $$,
  '3.4 plain text location saves');
select is((select location_text from itinerary_items where title = 'Lunch'), 'Fish Curry Place,  Goa', '3.4 it is stored as typed (outer spaces trimmed only)');
select is((select (location_url is null and latitude is null and longitude is null and formatted_address is null) from itinerary_items where title = 'Lunch'),
  true, '3.4 no link, coordinates or place are invented for plain text');
select is((select location_text from create_itinerary_item((select id from t), 'Blank', 'other', '2026-12-02', null, null, '{}', '   ')), null,
  '3.4 a blank location is stored as no location');

select * from finish();
rollback;
