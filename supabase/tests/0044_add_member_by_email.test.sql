begin;
select plan(7);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"full_name":"Cy"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
grant select on t to authenticated;

select is(add_member_by_email((select id from t), '  B@Example.com '), 'Ben', 'the owner adds someone who is already on along by email, ignoring case and spaces');
select is((select role::text from trip_members where trip_id = (select id from t) and user_id = '00000000-0000-0000-0000-00000000000b'), 'member', 'as a member');
select throws_ok($$ select add_member_by_email((select id from t), 'b@example.com') $$, 'P0001', 'already_member', 'adding them twice is refused');
select throws_ok($$ select add_member_by_email((select id from t), 'nobody@example.com') $$, 'P0001', 'user_not_found', 'an email nobody uses is reported as not found');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select throws_ok($$ select add_member_by_email((select id from t), 'c@example.com') $$, '42501', null, 'a member who is not the owner cannot add people');
select is((select count(*)::int from trips where id = (select id from t)), 1, 'and Ben, now a member, can see the trip');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select throws_ok($$ select add_member_by_email((select id from t), 'c@example.com') $$, '42501', null, 'a stranger cannot add anyone, not even themselves');

select * from finish();
rollback;
