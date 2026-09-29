begin;
select plan(16);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"full_name":"Cy"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2099-12-01', '2099-12-05', 'INR', 'k1')).id as id;
create temp table tok as select create_invite((select id from t)) as v;
grant select on t, tok to authenticated;
create temp table asha as select my_member_id((select id from t)) as id;
grant select on asha to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select accept_invite((select v from tok));
create temp table ben as select my_member_id((select id from t)) as id;
grant select on ben to authenticated;

-- Ben paid 1000 for Ben and Asha, and there is an itinerary item: an open balance and a plan to preserve
select create_expense((select id from t), 'Dinner', 1000, '2099-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 500),
  jsonb_build_object('member_id', (select id from ben), 'owed_minor', 500)), 'k-e');
select create_itinerary_item((select id from t), 'Beach day', 'activity', '2099-12-02');

select is((select phase from trip_phase where id = (select id from t)), 'upcoming', '7.1 before completion a future trip is upcoming');

select throws_ok($$ select complete_trip((select id from t)) $$, '42501', null, '7.1 a member who is not the owner cannot complete the trip');
select is((select status::text from trips where id = (select id from t)), 'published', '7.1 and nothing changed');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select throws_ok($$ select complete_trip((select id from t)) $$, '42501', null, '7.1 an outsider cannot complete it either');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select is((complete_trip((select id from t))).status::text, 'completed', '7.1 the owner completes the trip');
select ok((select completed_at is not null from trips where id = (select id from t)), '7.1 and it records when');
select is((select phase from trip_phase where id = (select id from t)), 'completed', '7.1 the trip is now in history');

create temp table first_at as select completed_at as at from trips where id = (select id from t);
grant select on first_at to authenticated;
select lives_ok($$ select complete_trip((select id from t)) $$, '7.1 completing again is a no-op, not an error');
select is((select completed_at from trips where id = (select id from t)), (select at from first_at), '7.1 and it does not change when it was completed');
select is((select version from trips where id = (select id from t)), 2, '7.1 the trip was written once, not twice');

-- everything is still there and readable, by every member
select is((select count(*)::int from expenses where trip_id = (select id from t)), 1, '7.1 the expense is still there');
select is((select count(*)::int from itinerary_items where trip_id = (select id from t)), 1, '7.1 the itinerary is still there');
select is((select net_minor::int from trip_member_balances where member_id = (select id from asha)), -500, '7.1 the outstanding balance is unchanged');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select is((select count(*)::int from trip_members where trip_id = (select id from t)), 2, '7.1 every member can still read the trip after completion');

-- balances are not frozen: the debt can still be settled
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select lives_ok($$ select create_settlement((select id from t), (select id from asha), (select id from ben), 500, 'sk-1') $$, '7.1 a completed trip can still be settled up');
select is((select coalesce(sum(net_minor), 0)::int from trip_member_balances where member_id = (select id from asha)), 0, '7.1 and the balance clears');

select * from finish();
rollback;
