begin;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"full_name":"Cy"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select is((set_my_country('in')).country::text, 'IN', 'a country is stored in upper case');
select throws_ok($$ select set_my_country('India') $$, '22023', null, 'a country must be a two-letter code');
select is((set_my_country(null)).country, null, 'the country can be cleared');

create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
create temp table tok as select create_invite((select id from t)) as v;
grant select on t, tok to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select accept_invite((select v from tok));
select lives_ok($$ select create_expense((select id from t), 'Lunch', 1000, '2026-12-03',
  jsonb_build_array(jsonb_build_object('member_id', my_member_id((select id from t)), 'owed_minor', 1000)), 'e1') $$, 'a member adds an expense');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select throws_ok($$ select delete_my_account() $$, '55000', 'owns_open_trips', 'an owner of an open trip that others are on cannot delete their account');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select lives_ok($$ select delete_my_account() $$, 'a member can delete their account');
select is((select display_name from users where id = '00000000-0000-0000-0000-00000000000b'), 'Deleted user', 'the person is anonymised');
select is((select display_name from trip_members where user_id = '00000000-0000-0000-0000-00000000000b' and trip_id = (select id from t)), 'Deleted user', 'and so is their name on the trip');
select is((select count(*)::int from expenses where trip_id = (select id from t)), 1, 'but the expense they shared is kept');

select * from finish();
rollback;
