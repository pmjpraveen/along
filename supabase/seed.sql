-- Local development data only (runs on `supabase db reset`). Three test people who sign in with a password instead of
-- Google, a trip in progress and a finished trip with a passport stamp, so every screen has something to show.
-- The password below exists only in this local database; set the same value as EXPO_PUBLIC_DEV_PASSWORD in your .env.

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                        created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', v.id::uuid, 'authenticated', 'authenticated', v.email,
       extensions.crypt('along-local-dev', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', v.name), now(), now(), '', '', '', ''
from (values
  ('a0000000-0000-0000-0000-00000000000a', 'asha@along.test', 'Asha'),
  ('a0000000-0000-0000-0000-00000000000b', 'ben@along.test', 'Ben'),
  ('a0000000-0000-0000-0000-00000000000c', 'cy@along.test', 'Cy')) v(id, email, name);

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email', jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), now(), now(), now()
from auth.users u where u.email like '%@along.test';

-- A trip in progress: Goa, with Ben and Cy joined by invite and Rahul as a guest with no account.
set role authenticated;
set request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000a"}';
create temp table goa as select (create_trip('Goa with the gang', 'Goa, India', '2026-09-25', '2026-10-02', 'INR', 'seed-goa')).id as id;
grant select on goa to authenticated;
create temp table goa_invite as select create_invite((select id from goa)) as v;
grant select on goa_invite to authenticated;
create temp table goa_guest as select (add_guest_member((select id from goa), 'Rahul')).id as id;
grant select on goa_guest to authenticated;
create temp table goa_asha as select my_member_id((select id from goa)) as id;
grant select on goa_asha to authenticated;

set request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b"}';
select accept_invite((select v from goa_invite));
create temp table goa_ben as select my_member_id((select id from goa)) as id;
grant select on goa_ben to authenticated;
set request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000c"}';
select accept_invite((select v from goa_invite));
create temp table goa_cy as select my_member_id((select id from goa)) as id;
grant select on goa_cy to authenticated;

set request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b"}';
select create_itinerary_item((select id from goa), 'Baga Beach', 'activity', '2026-09-26', '10:00',  null,
  array[(select id from goa_asha), (select id from goa_ben), (select id from goa_cy), (select id from goa_guest)], 'Baga Beach, Goa');
select create_itinerary_item((select id from goa), 'Fish curry lunch', 'restaurant', '2026-09-26', '13:30', null,
  array[(select id from goa_asha), (select id from goa_ben)], 'Fisherman''s Wharf');
select create_itinerary_item((select id from goa), 'Fort Aguada', 'place', '2026-09-27');

set request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000a"}';
select create_expense((select id from goa), 'Hotel', 2000000, '2026-09-25', jsonb_build_array(
  jsonb_build_object('member_id', (select id from goa_asha), 'owed_minor', 500000), jsonb_build_object('member_id', (select id from goa_ben), 'owed_minor', 500000),
  jsonb_build_object('member_id', (select id from goa_cy), 'owed_minor', 500000), jsonb_build_object('member_id', (select id from goa_guest), 'owed_minor', 500000)), 'seed-e1');
set request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b"}';
select create_expense((select id from goa), 'Dinner at the shack', 240000, '2026-09-26', jsonb_build_array(
  jsonb_build_object('member_id', (select id from goa_asha), 'owed_minor', 80000), jsonb_build_object('member_id', (select id from goa_ben), 'owed_minor', 80000),
  jsonb_build_object('member_id', (select id from goa_cy), 'owed_minor', 80000)), 'seed-e2', (select id from goa_cy));
set request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000a"}';
select create_expense((select id from goa), 'Scooter rental', 120100, '2026-09-27', jsonb_build_array(
  jsonb_build_object('member_id', (select id from goa_ben), 'owed_minor', 90075, 'split_value', 3),
  jsonb_build_object('member_id', (select id from goa_cy), 'owed_minor', 30025, 'split_value', 1)), 'seed-e3', (select id from goa_guest), 'shares');

-- A finished trip: Ooty in May, completed by its owner, which earns Asha and Ben a passport stamp.
set request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000a"}';
create temp table ooty as select (create_trip('Ooty weekend', 'Ooty, India', '2026-05-07', '2026-05-09', 'INR', 'seed-ooty')).id as id;
grant select on ooty to authenticated;
create temp table ooty_invite as select create_invite((select id from ooty)) as v;
grant select on ooty_invite to authenticated;
create temp table ooty_asha as select my_member_id((select id from ooty)) as id;
grant select on ooty_asha to authenticated;
set request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b"}';
select accept_invite((select v from ooty_invite));
create temp table ooty_ben as select my_member_id((select id from ooty)) as id;
grant select on ooty_ben to authenticated;
select create_expense((select id from ooty), 'Cottage', 900000, '2026-05-07', jsonb_build_array(
  jsonb_build_object('member_id', (select id from ooty_asha), 'owed_minor', 450000), jsonb_build_object('member_id', (select id from ooty_ben), 'owed_minor', 450000)), 'seed-o1');
select add_memory((select id from ooty), 'note', 'seed-m1', null, null, 'Tea gardens at sunrise. Worth the cold.');
set request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000a"}';
select complete_trip((select id from ooty));

reset role;

-- Sample cover photos (public placeholder images), so the trip list and headers look real without uploading files.
update trips set cover_url = 'https://picsum.photos/seed/along-goa/900/560' where name = 'Goa with the gang';
update trips set cover_url = 'https://picsum.photos/seed/along-ooty/900/560' where name = 'Ooty weekend';
