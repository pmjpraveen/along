begin;
select plan(11);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"full_name":"Cy"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
grant select on t to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
create temp table t2 as select (create_trip('Ooty', 'Ooty', '2026-12-01', '2026-12-05', 'INR', 'k2')).id as id;
grant select on t2 to authenticated;
select add_guest_member((select id from t2), 'Meera');
create temp table other as select id from trip_members where trip_id = (select id from t2) and display_name = 'Meera';
grant select on other to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select add_guest_member((select id from t), 'Rahul');
select add_member_by_email((select id from t), 'b@example.com');
create temp table ids as select
  (select id from trip_members where trip_id = (select id from t) and display_name = 'Rahul') as guest,
  (select id from trip_members where trip_id = (select id from t) and display_name = 'Ben') as ben,
  (select id from trip_members where trip_id = (select id from t) and role = 'owner') as owner;
grant select on ids to authenticated;
select create_invite((select id from t), null, null);

select lives_ok($$ select remove_member((select guest from ids)) $$, 'US-02 the owner removes a guest');
select is((select status::text from trip_members where id = (select guest from ids)), 'removed', 'US-02 the row is kept as removed, so history stays valid');
select lives_ok($$ select remove_member((select guest from ids)) $$, 'US-02 removing someone already removed does nothing');
select throws_ok($$ select remove_member((select owner from ids)) $$, 'P0001', 'only_guests_can_be_removed', 'US-02 the owner cannot be removed');
select throws_ok($$ select remove_member((select ben from ids)) $$, 'P0001', 'only_guests_can_be_removed', 'US-02 someone who has joined cannot be removed, only guests who have not');
select is((select status::text from trip_members where id = (select ben from ids)), 'active', 'US-02 the joined member is untouched');
select throws_ok($$ select remove_member((select id from other)) $$, '42501', null, 'US-02 cross-trip: the owner of one trip cannot remove someone from another');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select throws_ok($$ select remove_member((select guest from ids)) $$, '42501', null, 'US-02 a person outside the trip cannot remove anyone');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select add_member_by_email((select id from t), 'c@example.com');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select throws_ok($$ select remove_member((select guest from ids)) $$, '42501', null, 'US-02 a member who is not the owner cannot remove anyone');

set local role anon;
select throws_ok($$ select remove_member((select guest from ids)) $$, '42501', null, 'US-02 signed-out callers cannot remove anyone');
reset role;
select is((select count(*)::int from trip_members where id = (select guest from ids)), 1, 'US-02 nothing was deleted: the history is intact');

select * from finish();
rollback;
