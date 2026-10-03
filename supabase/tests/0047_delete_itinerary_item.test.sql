begin;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"full_name":"Cy"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
create temp table tok as select create_invite((select id from t)) as v;
grant select on t, tok to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select accept_invite((select v from tok));
create temp table i1 as select (create_itinerary_item((select id from t), 'Beach', 'activity', '2026-12-02')).id as id;
create temp table i2 as select (create_itinerary_item((select id from t), 'Fort', 'place', '2026-12-03')).id as id;
grant select on i1, i2 to authenticated;

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select throws_ok($$ select delete_itinerary_item((select id from i1)) $$, '42501', null, 'a stranger cannot delete a plan');
select throws_ok($$ select set_itinerary_participants((select id from i1), '{}') $$, '42501', null, 'and cannot change who is joining it either');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select lives_ok($$ select delete_itinerary_item((select id from i1)) $$, 'the person who added a plan can delete it');
select is((select count(*)::int from itinerary_items where id = (select id from i1) and deleted_at is null), 0, 'and it no longer shows');
select throws_ok($$ select delete_itinerary_item((select id from i1)) $$, 'P0002', null, 'deleting it again says it is gone');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select lives_ok($$ select delete_itinerary_item((select id from i2)) $$, 'the trip owner can delete a plan someone else added');

-- undo
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select throws_ok($$ select restore_itinerary_item((select id from i2)) $$, '42501', null, 'a stranger cannot bring a deleted plan back');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select lives_ok($$ select restore_itinerary_item((select id from i2)) $$, 'the owner can undo a delete');
select is((select count(*)::int from itinerary_items where id = (select id from i2) and deleted_at is null), 1, 'and the plan is back');

select * from finish();
rollback;
