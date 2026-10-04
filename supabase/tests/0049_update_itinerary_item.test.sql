begin;
select plan(11);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"full_name":"Cy"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
grant select on t to authenticated;
select add_member_by_email((select id from t), 'b@example.com');
select add_member_by_email((select id from t), 'c@example.com');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
create temp table item as select (create_itinerary_item((select id from t), 'Beach', 'activity', '2026-12-02', '10:00', null, '{}', 'Baga', null, 15.55, 73.75, 'Baga Beach', 'Bring sunscreen')).id as id;
grant select on item to authenticated;

select lives_ok($$ select update_itinerary_item((select id from item), 1, '  Sunset beach ', '2026-12-03', '17:30', 'Calangute', null, 15.54, 73.76, 'Calangute Beach', 'Bring a jacket') $$, 'US-03 the person who added a plan edits it');
select is((select title || ' | ' || day_date::text || ' | ' || start_time::text || ' | ' || location_text || ' | ' || description from itinerary_items where id = (select id from item)),
  'Sunset beach | 2026-12-03 | 17:30:00 | Calangute | Bring a jacket', 'US-03 title, day, time, place and message are all replaced');
select is((select version from itinerary_items where id = (select id from item)), 2, 'US-03 the version goes up');
select throws_ok($$ select update_itinerary_item((select id from item), 1, 'Late edit', '2026-12-03') $$, 'P0001', 'stale_version', 'US-03 a stale version is rejected, not overwritten');
select lives_ok($$ select update_itinerary_item((select id from item), 2, 'Sunset beach', '2026-12-03', null, null, null, null, null, null, null) $$, 'US-03 clearing the time, place and message works');
select is((select time_mode::text || ' ' || (location_text is null)::text || ' ' || (latitude is null)::text || ' ' || (description is null)::text from itinerary_items where id = (select id from item)),
  'none true true true', 'US-03 and they really are cleared');
select throws_ok($$ select update_itinerary_item((select id from item), 3, '   ', '2026-12-03') $$, '22023', null, 'US-03 a blank title is rejected');
select lives_ok($$ select update_itinerary_item((select id from item), 3, 'Beach', '2027-02-01') $$, 'US-03 a day outside the trip dates is allowed (and flagged)');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select throws_ok($$ select update_itinerary_item((select id from item), 4, 'Hijack', '2026-12-02') $$, '42501', null, 'US-03 another member cannot edit someone else''s plan');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select lives_ok($$ select update_itinerary_item((select id from item), 4, 'Owner edit', '2026-12-02') $$, 'US-03 the trip owner can edit any plan');

set local role anon;
select throws_ok($$ select update_itinerary_item((select id from item), 5, 'x', '2026-12-02') $$, '42501', null, 'US-03 signed-out callers cannot edit');

select * from finish();
rollback;
