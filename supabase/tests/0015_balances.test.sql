begin;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"full_name":"Cy"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
create temp table tok as select create_invite((select id from t)) as v;
grant select on t, tok to authenticated;
create temp table asha as select my_member_id((select id from t)) as id;
create temp table guest as select (add_guest_member((select id from t), 'Rahul')).id as id;
grant select on asha, guest to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select accept_invite((select v from tok));
create temp table ben as select my_member_id((select id from t)) as id;
grant select on ben to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';

-- Asha pays 1000 shared by Asha and Ben: Asha +500, Ben -500
create temp table ex as select (create_expense((select id from t), 'Lunch', 1000, '2026-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 500),
  jsonb_build_object('member_id', (select id from ben), 'owed_minor', 500)), 'k-a')).id as id;
grant select on ex to authenticated;
select is((select net_minor::int from trip_member_balances where member_id = (select id from asha)), 500, 'US-09 the payer is owed what others owe');
select is((select net_minor::int from trip_member_balances where member_id = (select id from ben)), -500, 'US-09 the other participant owes their share');

-- Ben pays 901 for Ben, Rahul (guest) and Asha: 301/300/300
select create_expense((select id from t), 'Cab', 901, '2026-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 300),
  jsonb_build_object('member_id', (select id from ben), 'owed_minor', 301),
  jsonb_build_object('member_id', (select id from guest), 'owed_minor', 300)), 'k-b', (select id from ben));
select is((select net_minor::int from trip_member_balances where member_id = (select id from asha)), 200, 'US-09 the balance reflects the new expense at once');
select is((select net_minor::int from trip_member_balances where member_id = (select id from guest)), -300, 'US-09 a guest carries a balance like anyone else');

-- Asha pays for Ben only: the payer is not a participant
select create_expense((select id from t), 'Gift', 400, '2026-12-03',
  jsonb_build_array(jsonb_build_object('member_id', (select id from ben), 'owed_minor', 400)), 'k-c');
select is((select net_minor::int from trip_member_balances where member_id = (select id from asha)), 600, 'US-09 paying for others without being in the split credits the payer in full');

select is((select coalesce(sum(net_minor), 0)::int from trip_member_balances where trip_id = (select id from t)), 0, 'US-09 balances in a trip sum to zero');

reset role;
select is_empty($$ select trip_id, currency, sum(net_minor) as drift from trip_member_balances group by trip_id, currency having sum(net_minor) <> 0 $$,
  'US-09 the balance drift query returns no rows');
update expenses set deleted_at = now() where id = (select id from ex);
select is((select net_minor::int from trip_member_balances where member_id = (select id from asha)), 100, 'US-09 a deleted expense no longer counts');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select is((select count(*)::int from trip_member_balances), 0, 'US-09 a non-member cannot see balances');

select * from finish();
rollback;
