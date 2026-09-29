begin;
select plan(3);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
grant select on t to authenticated;
create temp table asha as select my_member_id((select id from t)) as id;
grant select on asha to authenticated;

-- The offline queue re-sends the same call (same key) after every lost response or flaky flush.
do $$
begin
  for i in 1..5 loop
    perform create_expense((select id from t), 'Taxi', 25050, '2026-12-02',
      jsonb_build_array(jsonb_build_object('member_id', (select id from asha), 'owed_minor', 25050)), 'queued-key-1');
  end loop;
end $$;

select is((select count(*)::int from expenses), 1, '6.2 replaying a queued expense five times creates one expense');
select is((select count(*)::int from expense_participants), 1, '6.2 and one set of shares');
select is((select net_minor::int from trip_member_balances where member_id = (select id from asha)), 0, '6.2 and the balance counts it once');

select * from finish();
rollback;
