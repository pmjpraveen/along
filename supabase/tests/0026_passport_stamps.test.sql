begin;
select plan(16);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"full_name":"Cy"}'),
  ('00000000-0000-0000-0000-00000000000d', 'd@example.com', '{"full_name":"Dee"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa 2020', 'Goa, India', '2020-12-01', '2020-12-05', 'INR', 'k1')).id as id;
create temp table future as select (create_trip('Someday', 'Lisbon', '2099-12-01', '2099-12-05', 'INR', 'k2')).id as id;
create temp table tok as select create_invite((select id from t)) as v;
create temp table ftok as select create_invite((select id from future)) as v;
grant select on t, future, tok, ftok to authenticated;
create temp table guest as select (add_guest_member((select id from t), 'Rahul')).id as id;
grant select on guest to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select accept_invite((select v from tok));
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select accept_invite((select v from tok));
create temp table cy as select my_member_id((select id from t)) as id;
grant select on cy to authenticated;

-- Cy leaves before completion: removed members earn nothing
reset role;
update trip_members set status = 'removed', removed_at = now() where id = (select id from cy);
set local role authenticated;

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select throws_ok($$ select complete_trip((select id from t)) $$, '42501', null, '7.2 a member who is not the owner cannot trigger stamps');
select is((select count(*)::int from passport_stamps), 0, '7.2 and no stamp exists yet');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select complete_trip((select id from t));
select is((select count(*)::int from passport_stamps where trip_id = (select id from t)), 1, '7.2 the owner sees their own stamp only');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select is((select count(*)::int from passport_stamps where trip_id = (select id from t)), 1, '7.2 each member has one stamp');
select is((select destination_name || '/' || start_date || '/' || end_date || '/' || stamp_key from passport_stamps where trip_id = (select id from t)),
  'Goa, India/2020-12-01/2020-12-05/trip:' || (select id from t), '7.2 the stamp snapshots the destination and dates');
select is((select count(*)::int from passport_stamps), 1, '7.2 a member sees only their own stamps');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select is((select count(*)::int from passport_stamps), 0, '7.2 a member who was removed before completion gets none');

reset role;
select is((select count(*)::int from passport_stamps), 2, '7.2 one stamp per registered active member in total (the guest has no account)');

-- retries and re-completion never duplicate
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select complete_trip((select id from t));
select complete_trip((select id from t));
reset role;
select is((select count(*)::int from passport_stamps), 2, '7.2 re-completing creates no duplicate stamps');
select throws_ok($$ insert into passport_stamps (user_id, trip_id, destination_name, start_date, end_date, stamp_key)
  select user_id, trip_id, destination_name, start_date, end_date, stamp_key from passport_stamps limit 1 $$, '23505', null, '7.2 the database itself refuses a second stamp for the same trip');

-- editing the completed trip does not change the stamp
update trips set destination_name = 'Somewhere else', start_date = '2020-11-01' where id = (select id from t);
select is((select destination_name || '/' || start_date from passport_stamps where user_id = '00000000-0000-0000-0000-00000000000a'), 'Goa, India/2020-12-01',
  '7.2 editing a completed trip leaves the stamp as it was');

-- a guest who claims after completion earns the stamp then; claiming twice adds no second
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table ctok as select create_invite((select id from t), null, null, (select id from guest)) as v;
grant select on ctok to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d"}';
select claim_guest_profile((select v from ctok), true);
select claim_guest_profile((select v from ctok), true);
select is((select count(*)::int from passport_stamps where trip_id = (select id from t)), 1, '7.2 a guest who claims after completion earns the stamp once');
reset role;
select is((select count(*)::int from passport_stamps where trip_id = (select id from t)), 3, '7.2 and nobody else gained or lost one');

-- a trip that has not started earns no stamp
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select complete_trip((select id from future));
select is((select count(*)::int from passport_stamps where trip_id = (select id from future)), 0, '7.2 completing a trip that has not started earns no stamp');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select throws_ok($$ insert into passport_stamps (user_id, trip_id, destination_name, start_date, end_date, stamp_key)
  values (auth.uid(), (select id from t), 'x', '2020-01-01', '2020-01-02', 'k') $$, '42501', null, '7.2 clients cannot write stamps');
select throws_ok($$ select award_trip_stamps((select id from t)) $$, '42501', null, '7.2 the award function is not callable by clients');

select * from finish();
rollback;
