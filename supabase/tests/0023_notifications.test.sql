begin;
select plan(26);

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
create temp table guest as select (add_guest_member((select id from t), 'Rahul')).id as id;
grant select on asha, guest to authenticated;

-- Ben joins: Asha (the only other registered member) hears about it; Ben does not
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select accept_invite((select v from tok));
create temp table ben as select my_member_id((select id from t)) as id;
grant select on ben to authenticated;
select is((select count(*)::int from notifications where user_id = '00000000-0000-0000-0000-00000000000b'), 0, '6.4 the person who joined is not notified of their own join');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select is((select payload ->> 'actor' || ' ' || (payload ->> 'action') from notifications where type = 'trip_invitation'), 'Ben joined', '6.4 the trip hears that someone joined');

-- Cy joins: Asha and Ben hear
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select accept_invite((select v from tok));
create temp table cy as select my_member_id((select id from t)) as id;
grant select on cy to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select is((select count(*)::int from notifications where type = 'trip_invitation'), 1, '6.4 an existing member hears about the next join');

-- Ben adds an expense he paid, split between Ben and Asha: Asha's balance changes; Cy is not in it
select create_expense((select id from t), 'Dinner', 900, '2026-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 450),
  jsonb_build_object('member_id', (select id from ben), 'owed_minor', 450)), 'k-e');
set constraints all immediate;
set constraints all deferred;
select is((select count(*)::int from notifications where user_id = '00000000-0000-0000-0000-00000000000b' and type in ('new_expense', 'balance_change')), 0,
  '6.4 the person who added the expense is not notified');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select is((select array_agg(type::text order by type::text) from notifications where type in ('new_expense', 'balance_change')), array['balance_change'],
  '6.4 someone in the split hears that their balance changed (and only that)');
select is((select (payload ->> 'amount_minor')::int || '/' || (payload ->> 'exponent') || '/' || (payload ->> 'title') from notifications where type = 'balance_change'), '900/2/Dinner',
  '6.4 the notification carries the title, amount and currency decimals for the app to word');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select is((select array_agg(type::text order by type::text) from notifications where type in ('new_expense', 'balance_change')), array['new_expense'],
  '6.4 a member not in the split hears there is a new expense (and only that)');

-- retrying the same expense creates no second round of notifications
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select create_expense((select id from t), 'Dinner', 900, '2026-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 450),
  jsonb_build_object('member_id', (select id from ben), 'owed_minor', 450)), 'k-e');
set constraints all immediate;
set constraints all deferred;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select is((select count(*)::int from notifications where type = 'balance_change'), 1, '6.4 a retried expense does not notify twice');

-- Ben edits it: the people it touches hear "balance_change"
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select update_expense((select id from (select id from expenses limit 1) x), 1, 'Dinner', 1000, '2026-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 500),
  jsonb_build_object('member_id', (select id from ben), 'owed_minor', 500)));
set constraints all immediate;
set constraints all deferred;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select is((select count(*)::int from notifications where type = 'balance_change' and payload ->> 'action' = 'edited'), 1, '6.4 an edit notifies the affected people');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select is((select count(*)::int from notifications where payload ->> 'action' = 'edited'), 0, '6.4 an edit does not notify people it does not touch');

-- Ben records a payment to Asha: Asha hears, Ben does not, Cy is not a party
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select create_settlement((select id from t), (select id from ben), (select id from asha), 100, 'sk-1', null, null, true);
select is((select count(*)::int from notifications where type = 'settlement_update'), 0, '6.4 the person who recorded the payment is not notified');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select is((select count(*)::int from notifications where type = 'settlement_update'), 1, '6.4 the other party hears about the payment');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select is((select count(*)::int from notifications where type = 'settlement_update'), 0, '6.4 a member who is not a party is not bothered');

-- Ben adds and moves an itinerary item: the others hear
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
create temp table it as select (create_itinerary_item((select id from t), 'Beach day', 'activity', '2026-12-02')).id as id;
grant select on it to authenticated;
select move_itinerary_item((select id from it), '2026-12-03', 1);
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select is((select array_agg(payload ->> 'action' order by payload ->> 'action') from notifications where type = 'itinerary_change'), array['added', 'moved'],
  '6.4 the group hears an item was added and later moved');

-- Controllable: Cy turns off itinerary changes by default, then back on for this trip only
select set_notification_preference('itinerary_change', false);
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select create_itinerary_item((select id from t), 'Dinner out', 'restaurant', '2026-12-03');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select is((select count(*)::int from notifications where type = 'itinerary_change'), 2, '6.4 a type the user turned off is not delivered');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select is((select count(*)::int from notifications where type = 'itinerary_change'), 3, '6.4 and others still get it');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select set_notification_preference('itinerary_change', true, (select id from t));
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select create_itinerary_item((select id from t), 'Fort visit', 'place', '2026-12-04');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select is((select count(*)::int from notifications where type = 'itinerary_change'), 3, '6.4 a trip-specific choice overrides the default');
select is((select count(*)::int from notification_preferences), 2, '6.4 preferences are stored per user, per type, per trip');
select lives_ok($$ select set_notification_preference('itinerary_change', true, (select id from t)) $$, '6.4 setting the same preference again just updates it');

-- Read state, and privacy
create temp table mine as select id from notifications where type = 'itinerary_change' limit 1;
grant select on mine to authenticated;
select is(mark_notification_read((select id from mine)), true, '6.4 a member can mark their own notification read');
select is(mark_notification_read((select id from mine)), false, '6.4 marking it again changes nothing');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select is(mark_notification_read((select id from mine)), false, '6.4 nobody can mark someone else''s notification');
select throws_ok($$ insert into notifications (user_id, type) values ('00000000-0000-0000-0000-00000000000b', 'new_expense') $$, '42501', null, '6.4 clients cannot write notifications directly');

-- A guest claim tells the others
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table ctok as select create_invite((select id from t), null, null, (select id from guest)) as v;
grant select on ctok to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d"}';
select claim_guest_profile((select v from ctok), true);
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select is((select count(*)::int from notifications where payload ->> 'action' = 'claimed'), 1, '6.4 the group hears when a guest claims their spot');

-- Guests never get notifications, push tokens follow whoever registered last
reset role;
select is((select count(*)::int from notifications n join trip_members m on m.user_id = n.user_id where m.membership_type = 'guest'), 0, '6.4 guests have no account and get no notifications');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select register_push_token('ExponentPushToken[abc]', 'ios');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select register_push_token('ExponentPushToken[abc]', 'android');
reset role;
select is((select user_id::text || '/' || platform from push_tokens), '00000000-0000-0000-0000-00000000000c/android', '6.4 a push token belongs to whoever registered it last');

select * from finish();
rollback;
