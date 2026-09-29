begin;
select plan(14);

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
grant select on asha to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select accept_invite((select v from tok));
create temp table ben as select my_member_id((select id from t)) as id;
grant select on ben to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';

create temp table split as select jsonb_build_array(
  jsonb_build_object('member_id', (select id from asha), 'owed_minor', 500),
  jsonb_build_object('member_id', (select id from ben), 'owed_minor', 500)) as v;
grant select on split to authenticated;

create temp table ex as select (create_expense((select id from t), '  Lunch ', 1000, '2026-12-02', (select v from split), 'key-1')).id as id;
grant select on ex to authenticated;
select is((select paid_by_member_id from expenses where id = (select id from ex)), (select id from asha), 'US-05 the payer defaults to me');
select is((select created_by_member_id from expenses where id = (select id from ex)), (select id from asha), 'US-05 added-by is me');
select is((select title || '/' || amount_minor || '/' || currency from expenses where id = (select id from ex)), 'Lunch/1000/INR', 'US-05 title and amount are saved in the trip currency');
select is((select sum(owed_amount_minor)::int from expense_participants), 1000, 'US-05 the split sums to the total');

select is((create_expense((select id from t), 'Lunch', 1000, '2026-12-02', (select v from split), 'key-1')).id, (select id from ex), 'US-05 a retry returns the same expense');
select is((select count(*)::int from expenses), 1, 'US-05 a double submit creates one expense');
select is((select count(*)::int from expense_participants), 2, 'US-05 and one set of participants');

select throws_ok($$ select create_expense((select id from t), 'Bad', 1001, '2026-12-02', (select v from split), 'key-2') $$, '22023', 'split_must_sum', 'US-05 a split that does not sum is rejected');
select throws_ok($$ select create_expense((select id from t), 'Bad', 1000, '2026-12-02', '[]', 'key-3') $$, '22023', null, 'US-05 zero participants rejected');
select throws_ok($$ select create_expense((select id from t), 'Bad', 0, '2026-12-02', (select v from split), 'key-4') $$, '22023', null, 'US-05 a zero amount is rejected');
select throws_ok($$ select create_expense((select id from t), '   ', 1000, '2026-12-02', (select v from split), 'key-5') $$, '23514', null, 'US-05 a blank title is rejected');

-- the backstop trigger catches a bad split written any other way
reset role;
set constraints all immediate;
select throws_ok($$ update expense_participants set owed_amount_minor = 1 where expense_id = (select id from ex) and trip_member_id = (select id from asha) $$, '23514', null, 'US-05 the database refuses a split that does not sum');
set constraints all deferred;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select throws_ok($$ select create_expense((select id from t), 'Sneaky', 1000, '2026-12-02', (select v from split), 'key-6') $$, '42501', null, 'US-05 a non-member cannot add expenses');
select is((select count(*)::int from expenses) + (select count(*)::int from expense_participants), 0, 'US-05 a non-member cannot see expenses');

select * from finish();
rollback;
