begin;
select plan(11);

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
grant select on ben to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select accept_invite((select v from tok));
create temp table cy as select my_member_id((select id from t)) as id;
grant select on cy to authenticated;

-- Ben adds two dinners, each shared by Ben and Cy (500 each), and Cy adds one.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
create temp table ex as select
  (create_expense((select id from t), 'Dinner 1', 1000, '2026-12-02', jsonb_build_array(jsonb_build_object('member_id', (select id from ben), 'owed_minor', 500), jsonb_build_object('member_id', (select id from cy), 'owed_minor', 500)), 'k-1')).id as one,
  (create_expense((select id from t), 'Dinner 2', 1000, '2026-12-03', jsonb_build_array(jsonb_build_object('member_id', (select id from ben), 'owed_minor', 500), jsonb_build_object('member_id', (select id from cy), 'owed_minor', 500)), 'k-2')).id as two;
grant select on ex to authenticated;
select is((select net_minor::int from trip_member_balances where member_id = (select id from cy)), -1000, 'US-07 before deleting, Cy owes Ben 1000 over two dinners');

select lives_ok($$ select delete_expense((select one from ex)) $$, 'US-07 the person who added an expense deletes it');
select is((select count(*)::int from expenses where id = (select one from ex) and deleted_at is not null), 1, 'US-07 it is hidden, not erased: the row and its shares remain');
select is((select net_minor::int from trip_member_balances where member_id = (select id from cy)), -500, 'US-07 and the balances follow by themselves: Cy now owes 500');
select is((select coalesce(sum(net_minor), 0)::int from trip_member_balances where trip_id = (select id from t)), 0, 'US-07 balances still sum to zero');
select throws_ok($$ select delete_expense((select one from ex)) $$, 'P0002', null, 'US-07 deleting one that is already gone says so');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select throws_ok($$ select delete_expense((select two from ex)) $$, '42501', null, 'US-07 another member cannot delete someone else''s expense');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d"}';
select throws_ok($$ select delete_expense((select two from ex)) $$, '42501', null, 'US-07 someone outside the trip cannot delete it');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select lives_ok($$ select delete_expense((select two from ex)) $$, 'US-07 the trip owner can delete anyone''s expense');
select is((select count(*)::int from trip_member_balances where trip_id = (select id from t) and net_minor <> 0), 0, 'US-07 with both gone, everyone is at zero');

set local role anon;
select throws_ok($$ select delete_expense((select two from ex)) $$, '42501', null, 'US-07 signed-out callers cannot delete');

select * from finish();
rollback;
