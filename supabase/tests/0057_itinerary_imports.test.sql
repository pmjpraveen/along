begin;
select plan(5);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
grant select on t to authenticated;

select lives_ok($$ select claim_itinerary_import((select id from t)) $$, 'US-03 a trip member claims an import');
select lives_ok($$ select claim_itinerary_import((select id from t)) from generate_series(1, 19) $$, 'US-03 up to 20 imports a day are allowed');
select throws_ok($$ select claim_itinerary_import((select id from t)) $$, 'P0001', 'import_limit', 'US-03 the 21st import in a day is refused');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select throws_ok($$ select claim_itinerary_import((select id from t)) $$, '42501', null, 'US-03 someone outside the trip cannot import into it');
select is((select count(*)::int from itinerary_imports), 0, 'US-03 the usage table cannot be read directly');

select * from finish();
rollback;
