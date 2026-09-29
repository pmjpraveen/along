begin;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"full_name":"Cy"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa, India', '2020-12-01', '2020-12-05', 'INR', 'k1')).id as id;
create temp table tok as select create_invite((select id from t)) as v;
grant select on t, tok to authenticated;
create temp table asha as select my_member_id((select id from t)) as id;
create temp table guest as select (add_guest_member((select id from t), 'Rahul')).id as id;
grant select on asha, guest to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select accept_invite((select v from tok));
create temp table ben as select my_member_id((select id from t)) as id;
grant select on ben to authenticated;

select is((select people from trip_summary where trip_id = (select id from t)), 3, '7.5 the summary counts everyone in the trip, guests included');
select is((select total_spend_minor::int from trip_summary where trip_id = (select id from t)), 0, '7.5 with nothing spent the total is zero');

-- Ben pays 900 split three ways; Asha pays 300 for herself and Ben
select create_expense((select id from t), 'Dinner', 900, '2020-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 300),
  jsonb_build_object('member_id', (select id from ben), 'owed_minor', 300),
  jsonb_build_object('member_id', (select id from guest), 'owed_minor', 300)), 'k-a');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select create_expense((select id from t), 'Cab', 300, '2020-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 150),
  jsonb_build_object('member_id', (select id from ben), 'owed_minor', 150)), 'k-b');
select create_itinerary_item((select id from t), 'Beach day', 'activity', '2020-12-02');
select create_itinerary_item((select id from t), 'Fort', 'place', '2020-12-03');

select is((select total_spend_minor::int from trip_summary where trip_id = (select id from t)), 1200, '7.5 total spend is the sum of the expenses');
select is((select activities from trip_summary where trip_id = (select id from t)), 2, '7.5 activities are the itinerary items');
-- Ben +450 (paid 900, owes 300 + 150), Asha -150 (paid 300, owes 300 + 150), Rahul -300: 450 is still owed to Ben
select is((select outstanding_minor::int from trip_summary where trip_id = (select id from t)), 450, '7.5 outstanding is the total still owed across the group');
select is((select outstanding_minor::int from trip_summary where trip_id = (select id from t)),
  (select sum(net_minor)::int from trip_member_balances where trip_id = (select id from t) and net_minor > 0), '7.5 and matches the balances it is built from');

-- settling reduces it; deleted expenses and items are not counted
select create_settlement((select id from t), (select id from guest), (select id from ben), 300, 'sk-1');
select is((select outstanding_minor::int from trip_summary where trip_id = (select id from t)), 150, '7.5 settling brings the outstanding amount down (Rahul paid Ben 300)');
reset role;
update expenses set deleted_at = now() where title = 'Cab';
update itinerary_items set deleted_at = now() where title = 'Fort';
select is((select total_spend_minor::int || '/' || activities from trip_summary where trip_id = (select id from t)), '900/1', '7.5 deleted expenses and items are not counted');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select is((select count(*)::int from trip_summary), 0, '7.5 a non-member cannot see the summary');

select * from finish();
rollback;
