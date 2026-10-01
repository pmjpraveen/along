begin;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa, India', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
create temp table tok as select create_invite((select id from t)) as v;
grant select on t, tok to authenticated, anon;
select create_expense((select id from t), 'Lunch', 1000, '2026-12-03',
  jsonb_build_array(jsonb_build_object('member_id', my_member_id((select id from t)), 'owed_minor', 1000)), 'e1');

-- a stranger with no sign-in at all
set local role anon;
set local request.jwt.claims = '{}';
select is((preview_invite((select v from tok)) ->> 'name'), 'Goa', 'the preview shows the trip name without signing in');
select is((preview_invite((select v from tok)) ->> 'invited_by'), 'Asha', 'and who invited them');
select is((select array_agg(k order by k) from jsonb_object_keys(preview_invite((select v from tok))) k),
  array['card_color', 'destination', 'end_date', 'invited_by', 'name', 'participant_count', 'start_date'], 'and only that basic info: no plans, expenses or member list');
select is((select count(*)::int from expenses), 0, 'while the trip''s expenses stay hidden from them');

select * from finish();
rollback;
