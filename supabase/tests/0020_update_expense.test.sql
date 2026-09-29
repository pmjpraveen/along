begin;
select plan(14);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"full_name":"Cy"}'),
  ('00000000-0000-0000-0000-00000000000d', 'd@example.com', '{"full_name":"Dee"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
create temp table tok as select create_invite((select id from t)) as v;
grant select on t, tok to authenticated;
create temp table asha as select my_member_id((select id from t)) as id;
grant select on asha to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select accept_invite((select v from tok));
create temp table ben as select my_member_id((select id from t)) as id;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select accept_invite((select v from tok));
create temp table cy as select my_member_id((select id from t)) as id;
grant select on ben, cy to authenticated;

-- Ben adds a 900 expense he paid, split three ways
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
create temp table ex as select (create_expense((select id from t), 'Dinner', 900, '2026-12-02', jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 300),
  jsonb_build_object('member_id', (select id from ben), 'owed_minor', 300),
  jsonb_build_object('member_id', (select id from cy), 'owed_minor', 300)), 'k-a')).id as id;
grant select on ex to authenticated;
create temp table two as select jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 500),
  jsonb_build_object('member_id', (select id from ben), 'owed_minor', 500)) as v;
grant select on two to authenticated;

select is((update_expense((select id from ex), 1, ' Big dinner ', 1000, '2026-12-03', (select v from two))).title, 'Big dinner', '5.7 the creator can edit their expense');
select is((select amount_minor::int from expenses where id = (select id from ex)), 1000, '5.7 the amount changed');
select is((select version from expenses where id = (select id from ex)), 2, '5.7 the version is bumped');
select is((select net_minor::int from trip_member_balances where member_id = (select id from ben)), 500, '5.7 balances are recalculated (Ben paid 1000, owes 500)');
select is((select coalesce(sum(net_minor), 0)::int from trip_member_balances where member_id = (select id from cy)), 0, '5.7 a person removed from the split no longer owes anything');
select is((select created_by_member_id from expenses where id = (select id from ex)), (select id from ben), '5.7 added-by never changes');
select is((select coalesce(sum(net_minor), 0)::int from trip_member_balances where trip_id = (select id from t)), 0, '5.7 balances still sum to zero');

select throws_ok($$ select update_expense((select id from ex), 1, 'Stale', 1000, '2026-12-03', (select v from two)) $$, 'P0001', 'stale_version',
  '5.7 an edit based on an old version is rejected');
select throws_ok($$ select update_expense((select id from ex), 2, 'Bad', 1001, '2026-12-03', (select v from two)) $$, '22023', 'split_must_sum',
  '5.7 an invalid split is rejected');
select is((select title || amount_minor from expenses where id = (select id from ex)), 'Big dinner1000', '5.7 and the rejected edit changed nothing');

-- another member cannot edit Ben's expense
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select throws_ok($$ select update_expense((select id from ex), 2, 'Mine now', 1000, '2026-12-03', (select v from two)) $$, '42501', null,
  '5.7 editing another member''s expense is rejected');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d"}';
select throws_ok($$ select update_expense((select id from ex), 2, 'Outsider', 1000, '2026-12-03', (select v from two)) $$, '42501', null,
  '5.7 an outsider cannot edit it');

-- the owner can
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select lives_ok($$ select update_expense((select id from ex), 2, 'Owner fix', 1000, '2026-12-03', (select v from two)) $$, '5.7 the trip owner can edit it');

-- a deleted expense cannot be edited
reset role;
update expenses set deleted_at = now() where id = (select id from ex);
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select throws_ok($$ select update_expense((select id from ex), 3, 'Ghost', 1000, '2026-12-03', (select v from two)) $$, '42501', null, '5.7 a deleted expense cannot be edited');

select * from finish();
rollback;
