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
grant select on t, tok to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select accept_invite((select v from tok));
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select accept_invite((select v from tok));

-- Ben creates two items: one on day 2 (with a participant) and one already on day 3
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
create temp table it as select (create_itinerary_item((select id from t), 'Beach', 'activity', '2026-12-02', null, null,
  array[my_member_id((select id from t))])).id as id;
select create_itinerary_item((select id from t), 'Fort', 'place', '2026-12-03');
grant select on it to authenticated;

select is((move_itinerary_item((select id from it), '2026-12-03', 1)).day_date, '2026-12-03'::date, '3.5 the creator moves the item to the new date');
select is((select version from itinerary_items where id = (select id from it)), 2, '3.5 the version is bumped');
select is((select sort_order from itinerary_items where id = (select id from it)), 1, '3.5 it goes to the end of the new day');
select is((select count(*)::int from itinerary_items), 2, '3.5 no item is lost or duplicated');
select is((select count(*)::int from itinerary_participants where itinerary_item_id = (select id from it)), 1, '3.5 its participants move with it');

select throws_ok($$ select move_itinerary_item((select id from it), '2026-12-04', 1) $$, 'P0001', 'stale_version', '3.5 a stale version is rejected');
select is((select day_date from itinerary_items where id = (select id from it)), '2026-12-03'::date, '3.5 and nothing changed');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select throws_ok($$ select move_itinerary_item((select id from it), '2026-12-04', 2) $$, '42501', null, '3.5 another member cannot move it');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d"}';
select throws_ok($$ select move_itinerary_item((select id from it), '2026-12-04', 2) $$, '42501', null, '3.5 an outsider cannot move it');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select is((move_itinerary_item((select id from it), '2026-12-09', 2)).day_date, '2026-12-09'::date, '3.5 the owner can move it, even outside the trip dates');
select ok((select is_outside_trip_range from itinerary_items_flagged where id = (select id from it)), '3.5 and it is flagged');

reset role;
update itinerary_items set deleted_at = now() where id = (select id from it);
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select throws_ok($$ select move_itinerary_item((select id from it), '2026-12-02', 3) $$, '42501', null, '3.5 a deleted item cannot be moved');

select * from finish();
rollback;
