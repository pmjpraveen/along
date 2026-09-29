begin;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"full_name":"Cy"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
grant select on t to authenticated;

select lives_ok($$ select add_guest_member((select id from t), '  Rahul ') $$, 'US-02 owner adds a guest by name');
select is((select count(*)::int from trip_members where membership_type = 'guest' and user_id is null
           and role = 'guest' and display_name = 'Rahul'), 1, 'US-02 guest row has no user account and a trimmed name');
select lives_ok($$ select add_guest_member((select id from t), 'Rahul') $$, 'US-02 same name is allowed');
select is((select count(*)::int from trip_members where display_name = 'Rahul'), 2, 'US-02 same-name guests are never merged');
select throws_ok($$ select add_guest_member((select id from t), '   ') $$, '22023', null, 'US-02 blank name rejected');

-- a regular member cannot add guests
reset role;
insert into trip_members (trip_id, user_id, display_name, membership_type, role, status, joined_at)
  select id, '00000000-0000-0000-0000-00000000000b', 'Ben', 'registered', 'member', 'active', now() from t;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select throws_ok($$ select add_guest_member((select id from t), 'Sneaky') $$, '42501', null, 'US-02 non-owner member cannot add a guest');

-- an outsider cannot add or see guests
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select throws_ok($$ select add_guest_member((select id from t), 'Sneaky') $$, '42501', null, 'US-02 outsider cannot add a guest');
select is((select count(*)::int from trip_members), 0, 'US-02 outsider cannot see guests');

set local request.jwt.claims = '{}';
select throws_ok($$ select add_guest_member((select id from t), 'Anon') $$, '28000', null, 'US-02 unauthenticated call rejected');

select * from finish();
rollback;
