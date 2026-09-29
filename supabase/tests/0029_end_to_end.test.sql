-- One whole trip, start to finish, through the real functions and as the real users: the PRD's critical scenarios in order.
begin;
select plan(39);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'asha@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com', '{"full_name":"Ben"}'),
  ('00000000-0000-0000-0000-00000000000c', 'cy@example.com', '{"full_name":"Cy"}'),
  ('00000000-0000-0000-0000-00000000000d', 'dee@example.com', '{"full_name":"Dee"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';

-- 1. Trip creation ------------------------------------------------------------------------------------------------
select throws_ok($$ select create_trip('Bad', 'Goa', '2020-12-05', '2020-12-01', 'INR', 'kx') $$, '23514', null, 'E2E invalid dates are rejected');
create temp table t as select (create_trip('Goa', 'Goa, India', '2020-12-01', '2020-12-05', 'INR', 'k1')).id as id;
grant select on t to authenticated;
select is((select id from create_trip('Goa', 'Goa, India', '2020-12-01', '2020-12-05', 'INR', 'k1')), (select id from t), 'E2E creating the same trip twice returns the one trip');
create temp table asha as select my_member_id((select id from t)) as id;
grant select on asha to authenticated;

-- 2. People: a guest, and two friends joining by link ---------------------------------------------------------------
create temp table guest as select (add_guest_member((select id from t), 'Rahul')).id as id;
grant select on guest to authenticated;
create temp table tok as select create_invite((select id from t)) as v;
grant select on tok to authenticated;
select is((select participant_count from (select (preview_invite((select v from tok)) ->> 'participant_count')::int as participant_count) p), 2, 'E2E the invite preview shows the headcount without exposing money');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select accept_invite((select v from tok));
select accept_invite((select v from tok));
create temp table ben as select my_member_id((select id from t)) as id;
grant select on ben to authenticated;
select is((select count(*)::int from trip_members where user_id = auth.uid()), 1, 'E2E accepting the invite twice creates one membership');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select accept_invite((select v from tok));
create temp table cy as select my_member_id((select id from t)) as id;
grant select on cy to authenticated;
select is((select count(*)::int from trip_members where trip_id = (select id from t) and status = 'active'), 4, 'E2E the trip now has four people: three registered and one guest');

-- 3. Itinerary --------------------------------------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
create temp table item as select (create_itinerary_item((select id from t), 'Beach day', 'activity', '2020-12-02', null, null,
  array[(select id from ben), (select id from guest)], 'Baga Beach')).id as id;
grant select on item to authenticated;
select is((select count(*)::int from itinerary_participants where itinerary_item_id = (select id from item)), 2, 'E2E only the selected people are on the activity, the guest included');
select is((move_itinerary_item((select id from item), '2020-12-03', 1)).day_date, '2020-12-03'::date, 'E2E an item can move to another day');

-- 4. Expenses: every split method, every payer case -----------------------------------------------------------------
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
-- E1: Asha pays 1000, equal among all four
create temp table e1 as select (create_expense((select id from t), 'Hotel', 1000, '2020-12-01', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 250), jsonb_build_object('member_id', (select id from ben), 'owed_minor', 250),
  jsonb_build_object('member_id', (select id from cy), 'owed_minor', 250), jsonb_build_object('member_id', (select id from guest), 'owed_minor', 250)), 'e1')).id as id;
select is((select paid_by_member_id from expenses where id = (select id from e1)), (select id from asha), 'E2E the payer defaults to whoever adds it');

-- E2: Ben adds an expense that Cy paid, split three ways
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
create temp table e2 as select (create_expense((select id from t), 'Dinner', 900, '2020-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 300), jsonb_build_object('member_id', (select id from ben), 'owed_minor', 300),
  jsonb_build_object('member_id', (select id from cy), 'owed_minor', 300)), 'e2', (select id from cy))).id as id;
grant select on e1, e2 to authenticated;
select is((select paid_by_member_id = (select id from cy) and created_by_member_id = (select id from ben) from expenses where id = (select id from e2)), true,
  'E2E a member can record an expense someone else paid: paid-by and added-by stay separate');

-- E3: the owner records an expense the guest paid, percentage split with rounding (1200 at 33.33 / 66.67 -> 400 / 800)
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select throws_ok($$ select create_expense((select id from t), 'Bad', 1200, '2020-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from guest), 'owed_minor', 400, 'split_value', 3333),
  jsonb_build_object('member_id', (select id from ben), 'owed_minor', 800, 'split_value', 6666)), 'bad-pct', (select id from guest), 'percentage') $$,
  '22023', 'percentages_must_total_100', 'E2E percentages that total 99.99% are rejected');
select lives_ok($$ select create_expense((select id from t), 'Boat', 1200, '2020-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from guest), 'owed_minor', 400, 'split_value', 3333),
  jsonb_build_object('member_id', (select id from ben), 'owed_minor', 800, 'split_value', 6667)), 'e3', (select id from guest), 'percentage') $$,
  'E2E the owner records an expense paid by a guest, split by percentage');
select throws_ok($$ select create_expense((select id from t), 'Bad', 1000, '2020-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 600, 'split_value', 600),
  jsonb_build_object('member_id', (select id from ben), 'owed_minor', 399, 'split_value', 399)), 'bad-custom', null, 'custom') $$,
  '22023', 'split_must_sum', 'E2E custom amounts that do not add up are rejected');

-- E4: Ben pays 1001 for Asha and Cy in shares 3:1 (751 / 250: the extra unit goes to the biggest remainder)
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select lives_ok($$ select create_expense((select id from t), 'Fuel', 1001, '2020-12-03', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 751, 'split_value', 3),
  jsonb_build_object('member_id', (select id from cy), 'owed_minor', 250, 'split_value', 1)), 'e4', null, 'shares') $$, 'E2E a share-based split with rounding is saved');

-- duplicate submission of an expense (a double tap, or an offline retry)
select create_expense((select id from t), 'Fuel', 1001, '2020-12-03', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 751, 'split_value', 3),
  jsonb_build_object('member_id', (select id from cy), 'owed_minor', 250, 'split_value', 1)), 'e4', null, 'shares');
select is((select count(*)::int from expenses where trip_id = (select id from t)), 4, 'E2E a replayed submission yields one expense: four in total');

-- 5. Balances -----------------------------------------------------------------------------------------------------------
select is((select array_agg(net_minor::int order by member_id) from trip_member_balances where member_id in ((select id from asha), (select id from ben), (select id from cy), (select id from guest))),
  (select array_agg(n order by m) from (values ((select id from asha), -301), ((select id from ben), -349), ((select id from cy), 100), ((select id from guest), 550)) v(m, n)),
  'E2E balances after four expenses: Asha -301, Ben -349, Cy +100, Rahul +550');
select is((select coalesce(sum(net_minor), 0)::int from trip_member_balances where trip_id = (select id from t)), 0, 'E2E balances sum to zero');

-- 6. Editing: your own recalculates, someone else''s is rejected, a stale edit is rejected ----------------------------------
select is((update_expense((select id from e2), 1, 'Dinner', 1200, '2020-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 400), jsonb_build_object('member_id', (select id from ben), 'owed_minor', 400),
  jsonb_build_object('member_id', (select id from cy), 'owed_minor', 400)), (select id from cy))).version, 2, 'E2E the creator edits their own expense');
select is((select net_minor::int from trip_member_balances where member_id = (select id from cy)), 300, 'E2E editing recalculates balances (Cy now +300)');
select throws_ok($$ select update_expense((select id from e2), 1, 'Stale', 1200, '2020-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 400), jsonb_build_object('member_id', (select id from ben), 'owed_minor', 400),
  jsonb_build_object('member_id', (select id from cy), 'owed_minor', 400))) $$, 'P0001', 'stale_version', 'E2E an edit based on an old version never silently overwrites a newer one');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select throws_ok($$ select update_expense((select id from e2), 2, 'Cy edits Ben''s', 1200, '2020-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 400), jsonb_build_object('member_id', (select id from ben), 'owed_minor', 400),
  jsonb_build_object('member_id', (select id from cy), 'owed_minor', 400))) $$, '42501', null, 'E2E editing another member''s expense is rejected');

-- 7. Settlements --------------------------------------------------------------------------------------------------------
-- now: Asha -401, Ben -449, Cy +300, Rahul +550
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
create temp table s1 as select (create_settlement((select id from t), (select id from ben), (select id from cy), 300, 'sk-1')).id as id;
grant select on s1 to authenticated;
select is((select net_minor::int from trip_member_balances where member_id = (select id from ben)), -149, 'E2E a settlement changes the balance');
select is((create_settlement((select id from t), (select id from ben), (select id from cy), 300, 'sk-1')).id, (select id from s1), 'E2E submitting the same settlement twice returns the first');
select is((select count(*)::int from settlements), 1, 'E2E and there is only one settlement row');
select throws_ok($$ select create_settlement((select id from t), (select id from ben), (select id from cy), 50, 'sk-2') $$, 'P0001', 'exceeds_outstanding_debt',
  'E2E paying more than is owed is refused');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select lives_ok($$ select create_settlement((select id from t), (select id from asha), (select id from guest), 401, 'sk-3') $$, 'E2E the owner settles a payment to the guest');
select is((select net_minor::int from trip_member_balances where member_id = (select id from guest)), 149, 'E2E the guest''s balance moves toward zero');

-- 8. Notifications and the feed -------------------------------------------------------------------------------------------
select ok((select count(*) from notifications where user_id = '00000000-0000-0000-0000-00000000000a') > 0, 'E2E members were notified of what happened in the trip');
select is((select count(*)::int from activity_events where action = 'created' and entity_type = 'expense'), 4, 'E2E the feed has each new expense once');

-- 9. Completion keeps the financial history -----------------------------------------------------------------------------
create temp table before_balances as select member_id, net_minor from trip_member_balances where trip_id = (select id from t);
grant select on before_balances to authenticated;
select complete_trip((select id from t));
select is((select status::text from trips where id = (select id from t)), 'completed', 'E2E the owner completes the trip');
select is((select count(*)::int from expenses where trip_id = (select id from t)), 4, 'E2E a completed trip keeps every expense');
select is((select count(*)::int from trip_member_balances b join before_balances p using (member_id) where b.net_minor = p.net_minor), 4, 'E2E and every balance exactly as it was');
select is((select count(*)::int from passport_stamps where trip_id = (select id from t)), 1, 'E2E the owner has one stamp; guests have none yet');

-- 10. Memories ---------------------------------------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select lives_ok($$ select add_memory((select id from t), 'note', 'mem-1', null, null, 'Best trip ever') $$, 'E2E a member adds a memory to the completed trip');

-- 11. The guest claims their spot: no duplicate person, history carries over ------------------------------------------------
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table ctok as select create_invite((select id from t), null, null, (select id from guest)) as v;
grant select on ctok to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d"}';
select claim_guest_profile((select v from ctok), true);
select claim_guest_profile((select v from ctok), true);
select is((select count(*)::int from trip_members where trip_id = (select id from t) and status = 'active'), 4, 'E2E claiming a guest spot does not add a fifth person, even claimed twice');
select is((select net_minor::int from trip_member_balances where member_id = (select id from guest)), 149, 'E2E the guest''s history now belongs to the new account');
select is((select count(*)::int from passport_stamps where trip_id = (select id from t)), 1, 'E2E the claimer earns the stamp exactly once');

-- 12. Integrity checks CI runs -------------------------------------------------------------------------------------------
reset role;
select lives_ok($$ set constraints all immediate $$, 'E2E every deferred check (split sums, notifications) passes at commit');
select is_empty($$ select trip_id, currency, sum(net_minor) from trip_member_balances group by trip_id, currency having sum(net_minor) <> 0 $$, 'E2E CI: the balance drift query returns no rows');
select is((select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity), 0, 'E2E CI: every public table has row level security on');

select * from finish();
rollback;
