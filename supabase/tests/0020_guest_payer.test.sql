begin;
select plan(8);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}');

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

-- The owner records a 900 dinner that Rahul (a guest with no account) paid, split three ways
create temp table ex as select (create_expense((select id from t), 'Dinner', 900, '2026-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 300),
  jsonb_build_object('member_id', (select id from ben), 'owed_minor', 300),
  jsonb_build_object('member_id', (select id from guest), 'owed_minor', 300)), 'k-a', (select id from guest))).id as id;

select is((select paid_by_member_id from expenses where id = (select id from ex)), (select id from guest), 'US-13 the guest is recorded as the payer');
select is((select created_by_member_id from expenses where id = (select id from ex)), (select id from asha), 'US-13 the owner is recorded as added-by');
select is((select net_minor::int from trip_member_balances where member_id = (select id from guest)), 600, 'US-13 the guest is credited in the balances');
select is((select net_minor::int from trip_member_balances where member_id = (select id from asha)), -300, 'US-13 the owner owes their share to the guest');
select is((select net_minor::int from trip_member_balances where member_id = (select id from ben)), -300, 'US-13 and so does everyone else in the split');
select is((select coalesce(sum(net_minor), 0)::int from trip_member_balances where trip_id = (select id from t)), 0, 'US-13 balances still sum to zero');

-- the owner can settle on the guest's behalf
select lives_ok($$ select create_settlement((select id from t), (select id from ben), (select id from guest), 300, 'sk-1') $$,
  'US-13 the owner can record a payment to the guest for someone else');
select is((select net_minor::int from trip_member_balances where member_id = (select id from guest)), 300, 'US-13 and the guest''s balance moves toward zero');

select * from finish();
rollback;
