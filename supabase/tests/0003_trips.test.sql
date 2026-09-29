begin;
select plan(11);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';

select lives_ok($$ select create_trip('Goa', 'Goa, India', '2026-12-01', '2026-12-05', 'INR', 'k1') $$,
  'US-01 valid name and dates creates a trip');
select is((select count(*)::int from trip_members where role = 'owner' and user_id = auth.uid()), 1,
  'US-01 creator becomes the active owner');
select is((select display_name from trip_members), 'Asha', 'US-01 owner row carries the creator display name');

select lives_ok($$ select create_trip('Goa', 'Goa, India', '2026-12-01', '2026-12-05', 'INR', 'k1') $$, 'US-01 retry succeeds');
select is((select count(*)::int from trips), 1, 'US-01 retry with same key creates no duplicate trip');
select is((select count(*)::int from trip_members), 1, 'US-01 retry creates no duplicate membership');

select throws_ok($$ select create_trip('  ', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k2') $$, '23514',
  null, 'US-01 blank name rejected');
select throws_ok($$ select create_trip('Goa', 'Goa', '2026-12-05', '2026-12-01', 'INR', 'k3') $$, '23514',
  null, 'US-01 end date before start date rejected');
select throws_ok($$ insert into trips (created_by_user_id, name, destination_name, start_date, end_date, primary_currency)
  values (auth.uid(), 'x', 'x', '2026-12-01', '2026-12-02', 'INR') $$, '42501',
  null, 'US-01 clients cannot insert trips directly');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select is((select count(*)::int from trips), 0, 'US-01 non-members cannot see the trip');
select is((select count(*)::int from trip_members), 0, 'US-01 non-members cannot see its members');

select * from finish();
rollback;
