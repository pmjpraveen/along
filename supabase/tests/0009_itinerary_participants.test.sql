begin;
select plan(12);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"full_name":"Cy"}'),
  ('00000000-0000-0000-0000-00000000000d', 'd@example.com', '{"full_name":"Dee"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
create temp table tok as select create_invite((select id from t)) as v;
create temp table g as select (add_guest_member((select id from t), 'Rahul')).id as id;
create temp table other as select (create_trip('Elsewhere', 'X', '2026-12-01', '2026-12-05', 'INR', 'k2')).id as id;
grant select on t, tok, g, other to authenticated;
create temp table asha as select my_member_id((select id from t)) as id;
grant select on asha to authenticated;

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select accept_invite((select v from tok));
create temp table ben as select my_member_id((select id from t)) as id;
grant select on ben to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';

create temp table it as select (create_itinerary_item((select id from t), 'Dinner', 'restaurant', '2026-12-02', null, null,
  array[(select id from asha), (select id from g)])).id as id;
grant select on it to authenticated;
select is((select count(*)::int from itinerary_participants where itinerary_item_id = (select id from it)), 2,
  'US-04 only the selected people are associated');
select is((select count(*)::int from itinerary_participants where itinerary_item_id = (select id from it) and trip_member_id = (select id from ben)), 0,
  'US-04 an unselected member is not associated');
select ok(exists (select 1 from itinerary_participants where trip_member_id = (select id from g)), 'US-04 a guest can be a participant');

select lives_ok($$ select create_itinerary_item((select id from t), 'Nap', 'free_time', '2026-12-02') $$, 'US-04 an item with nobody selected is valid');
select is((select count(*)::int from itinerary_participants p join itinerary_items i on i.id = p.itinerary_item_id where i.title = 'Nap'), 0,
  'US-04 and has no participants');

select throws_ok($$ select create_itinerary_item((select id from t), 'X', 'activity', '2026-12-02', null, null, array[(select id from other)]) $$,
  '22023', null, 'US-04 an id that is not a member of this trip is rejected');

select lives_ok($$ select set_itinerary_participants((select id from it), array[(select id from ben)]) $$, 'US-04 the creator can replace the list');
select is((select array_agg(trip_member_id) from itinerary_participants where itinerary_item_id = (select id from it)), array[(select id from ben)],
  'US-04 the list is replaced, not appended');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select throws_ok($$ select set_itinerary_participants((select id from it), '{}') $$, '42501', null, 'US-04 a member who is neither creator nor owner cannot change participants');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d"}';
select is((select count(*)::int from itinerary_participants), 0, 'US-04 an outsider cannot see participants');
select throws_ok($$ select set_itinerary_participants((select id from it), '{}') $$, '42501', null, 'US-04 an outsider cannot change participants');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select throws_ok($$ select replace_item_participants((select id from it), (select id from t), '{}') $$, '42501', null, 'US-04 the internal helper is not callable by clients');

select * from finish();
rollback;
