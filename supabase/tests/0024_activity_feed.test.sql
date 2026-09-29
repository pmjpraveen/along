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
create temp table asha as select my_member_id((select id from t)) as id;
grant select on asha to authenticated;

select is((select count(*)::int from activity_events), 0, '6.5 creating a trip does not put the owner in the feed as "joining"');

create temp table guest as select (add_guest_member((select id from t), 'Rahul')).id as id;
grant select on guest to authenticated;
select is((select action || '/' || (summary ->> 'name') from activity_events where entity_type = 'member'), 'guest_added/Rahul', '6.5 adding a guest is in the feed');
select is((select actor_member_id from activity_events where entity_type = 'member'), (select id from asha), '6.5 attributed to whoever added them');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select accept_invite((select v from tok));
create temp table ben as select my_member_id((select id from t)) as id;
grant select on ben to authenticated;
select is((select count(*)::int from activity_events where action = 'joined' and summary ->> 'name' = 'Ben'), 1, '6.5 a join is in the feed');
select accept_invite((select v from tok));
select is((select count(*)::int from activity_events where action = 'joined'), 1, '6.5 accepting the invite twice does not repeat it');

select create_itinerary_item((select id from t), 'Beach day', 'activity', '2026-12-02');
select is((select summary ->> 'title' from activity_events where entity_type = 'itinerary_item'), 'Beach day', '6.5 an itinerary addition is in the feed');

select create_expense((select id from t), 'Dinner', 900, '2026-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 450),
  jsonb_build_object('member_id', (select id from ben), 'owed_minor', 450)), 'k-e');
select create_expense((select id from t), 'Dinner', 900, '2026-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 450),
  jsonb_build_object('member_id', (select id from ben), 'owed_minor', 450)), 'k-e');
select is((select (summary ->> 'amount_minor')::int || '/' || (summary ->> 'exponent') || '/' || (summary ->> 'paid_by') from activity_events where entity_type = 'expense'), '900/2/Ben',
  '6.5 a new expense is in the feed with amount, currency decimals and payer');
select is((select count(*)::int from activity_events where entity_type = 'expense'), 1, '6.5 a retried expense appears once');

-- edits and moves are notifications, not feed entries
select update_expense((select id from expenses limit 1), 1, 'Dinner', 1000, '2026-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 500),
  jsonb_build_object('member_id', (select id from ben), 'owed_minor', 500)));
select is((select count(*)::int from activity_events where entity_type = 'expense'), 1, '6.5 an edit does not add a feed entry');

-- claiming
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table ctok as select create_invite((select id from t), null, null, (select id from guest)) as v;
grant select on ctok to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d"}';
select claim_guest_profile((select v from ctok), true);
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select is((select count(*)::int from activity_events where action = 'claimed'), 1, '6.5 a guest claiming their spot is in the feed');

-- chronological, member-only, read-only
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select is((select count(*)::int from activity_events), 0, '6.5 a non-member sees nothing');
select throws_ok($$ insert into activity_events (trip_id, entity_type, entity_id, action) values ((select id from t), 'expense', gen_random_uuid(), 'created') $$, '42501', null,
  '6.5 clients cannot write feed entries');

select * from finish();
rollback;
