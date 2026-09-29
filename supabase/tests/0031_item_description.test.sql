begin;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"full_name":"Cy"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
grant select on t to authenticated;

select is((create_itinerary_item((select id from t), 'Beach', 'activity', '2026-12-02', null, null, '{}', null, null, null, null, null, '  Bring sunscreen  ')).description,
  'Bring sunscreen', 'a plan keeps its message, trimmed');
select is((create_itinerary_item((select id from t), 'Lunch', 'restaurant', '2026-12-02')).description, null, 'the message is optional');
select is((create_itinerary_item((select id from t), 'Walk', 'activity', '2026-12-02', null, null, '{}', null, null, null, null, null, '   ')).description, null, 'a blank message is stored as none');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select throws_ok($$ select create_itinerary_item((select id from t), 'X', 'activity', '2026-12-02', null, null, '{}', null, null, null, null, null, 'hi') $$,
  '42501', null, 'an outsider cannot add a plan');

select * from finish();
rollback;
