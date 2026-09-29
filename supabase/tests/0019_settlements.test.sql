begin;
select plan(18);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"full_name":"Cy"}'),
  ('00000000-0000-0000-0000-00000000000d', 'd@example.com', '{"full_name":"Dee"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
create temp table other_trip as select (create_trip('Elsewhere', 'X', '2026-12-01', '2026-12-05', 'INR', 'k2')).id as id;
create temp table tok as select create_invite((select id from t)) as v;
grant select on t, other_trip, tok to authenticated;
create temp table asha as select my_member_id((select id from t)) as id;
create temp table guest as select (add_guest_member((select id from t), 'Rahul')).id as id;
grant select on asha, guest to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select accept_invite((select v from tok));
create temp table ben as select my_member_id((select id from t)) as id;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select accept_invite((select v from tok));
grant select on ben to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';

-- Asha pays 1500 for Asha, Ben, Rahul (500 each): Asha +1000, Ben -500, Rahul -500
select create_expense((select id from t), 'Hotel', 1500, '2026-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 500),
  jsonb_build_object('member_id', (select id from ben), 'owed_minor', 500),
  jsonb_build_object('member_id', (select id from guest), 'owed_minor', 500)), 'k-e');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
create temp table s1 as select (create_settlement((select id from t), (select id from ben), (select id from asha), 300, 'sk-1', null, 'cash')).id as id;
grant select on s1 to authenticated;
select is((select net_minor::int from trip_member_balances where member_id = (select id from ben)), -200, '5.5 the payer moves toward zero');
select is((select net_minor::int from trip_member_balances where member_id = (select id from asha)), 700, '5.5 the receiver moves toward zero');
select is((select coalesce(sum(net_minor), 0)::int from trip_member_balances where trip_id = (select id from t)), 0, '5.5 balances still sum to zero');
select is((select currency::text || '/' || note from settlements where id = (select id from s1)), 'INR/cash', '5.5 it records the trip currency and note');

select is((create_settlement((select id from t), (select id from ben), (select id from asha), 300, 'sk-1')).id, (select id from s1), '5.5 a retry returns the same settlement');
select is((select count(*)::int from settlements), 1, '5.5 a double submit creates one row');

select throws_ok($$ select create_settlement((select id from t), (select id from ben), (select id from asha), 201, 'sk-2') $$, 'P0001', 'exceeds_outstanding_debt',
  '5.5 a payment above what the payer still owes is rejected');
select lives_ok($$ select create_settlement((select id from t), (select id from ben), (select id from asha), 201, 'sk-3', null, null, true) $$,
  '5.5 it is allowed with the explicit overpayment flag');
select throws_ok($$ select create_settlement((select id from t), (select id from ben), (select id from asha), 0, 'sk-4') $$, '22023', null, '5.5 a zero amount is rejected');
select throws_ok($$ select create_settlement((select id from t), (select id from ben), (select id from ben), 10, 'sk-5') $$, '22023', null, '5.5 paying yourself is rejected');
select throws_ok($$ select create_settlement((select id from t), (select id from ben), (select my_member_id((select id from other_trip))), 10, 'sk-6', null, null, true) $$,
  '22023', null, '5.5 someone from another trip cannot be a party');

-- Cy is neither party nor owner
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select throws_ok($$ select create_settlement((select id from t), (select id from guest), (select id from asha), 100, 'sk-7') $$, '42501', null,
  '5.5 a member who is neither party nor owner cannot record it');

-- the owner can record it on behalf of a guest
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select lives_ok($$ select create_settlement((select id from t), (select id from guest), (select id from asha), 400, 'sk-8') $$, '5.5 the owner can record a guest''s payment');

-- immutability and mirror, as the table owner
reset role;
select throws_ok($$ update settlements set amount_minor = 1 $$, '42501', null, '5.5 settlements cannot be updated');
select throws_ok($$ delete from settlements $$, '42501', null, '5.5 settlements cannot be deleted');
select throws_ok($$ insert into settlements (trip_id, kind, from_member_id, to_member_id, amount_minor, currency, reverses_settlement_id, created_by_member_id)
  select trip_id, 'reversal', from_member_id, to_member_id, amount_minor + 1, currency, id, created_by_member_id from settlements where id = (select id from s1) $$,
  '23514', null, '5.5 a reversal that does not mirror the payment is rejected');
select lives_ok($$ insert into settlements (trip_id, kind, from_member_id, to_member_id, amount_minor, currency, reverses_settlement_id, created_by_member_id)
  select trip_id, 'reversal', from_member_id, to_member_id, amount_minor, currency, id, created_by_member_id from settlements where id = (select id from s1) $$,
  '5.5 a mirrored reversal is accepted');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d"}';
select is((select count(*)::int from settlements), 0, '5.5 a non-member cannot see settlements');

select * from finish();
rollback;
