begin;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
grant select on t to authenticated;
create temp table e as select (create_expense((select id from t), 'Lunch', 1000, '2026-12-03',
  jsonb_build_array(jsonb_build_object('member_id', my_member_id((select id from t)), 'owed_minor', 1000)), 'e1')).id as id;
grant select on e to authenticated;

select is((select count(*)::int from activity_events where entity_type = 'expense' and action = 'created'), 1, 'creating logs one entry');
select lives_ok($$ select update_expense((select id from e), 1, 'Big lunch', 2000, '2026-12-03',
  jsonb_build_array(jsonb_build_object('member_id', my_member_id((select id from t)), 'owed_minor', 2000)), my_member_id((select id from t)), 'equal') $$, 'an edit goes through');
select is((select summary->>'title' from activity_events where entity_type = 'expense' and action = 'edited'), 'Big lunch', 'and is logged as edited, with the new title');
select is((select count(*)::int from activity_events where entity_type = 'expense' and action = 'created'), 1, 'without adding another created entry');

select * from finish();
rollback;
