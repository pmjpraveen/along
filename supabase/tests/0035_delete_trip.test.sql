begin;
select plan(8);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"full_name":"Cy"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
create temp table t2 as select (create_trip('Ooty', 'Ooty', '2026-12-01', '2026-12-05', 'INR', 'k2')).id as id;
create temp table tok as select create_invite((select id from t)) as v;
create temp table tok2 as select create_invite((select id from t2)) as v;
grant select on t, t2, tok, tok2 to authenticated;
select create_expense((select id from t), 'Lunch', 1000, '2026-12-03',
  jsonb_build_array(jsonb_build_object('member_id', my_member_id((select id from t)), 'owed_minor', 1000)), 'e1');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select accept_invite((select v from tok));
select accept_invite((select v from tok2));

-- a member who is not the owner, and a stranger, cannot delete
select throws_ok($$ select delete_trip((select id from t2)) $$, '42501', null, 'a member who is not the owner cannot delete the trip');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select throws_ok($$ select delete_trip((select id from t2)) $$, '42501', null, 'a stranger cannot delete the trip');

-- the owner can, and the trip disappears for everyone
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select lives_ok($$ select delete_trip((select id from t)) $$, 'the owner can delete the trip');
select is((select count(*) from trips where id = (select id from t)), 0::bigint, 'the owner no longer sees it');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select is((select count(*) from trips where id = (select id from t)), 0::bigint, 'and neither does another member');
select is((select count(*) from trips where id = (select id from t2)), 1::bigint, 'other trips are untouched');

-- nothing is erased: the trip and its expense are still in the database
reset role;
select is((select count(*) from trips where id = (select id from t) and deleted_at is not null), 1::bigint, 'the trip is marked deleted, not erased');
select is((select count(*) from expenses where trip_id = (select id from t)), 1::bigint, 'and its expense is kept');

select * from finish();
rollback;
