begin;
select plan(3);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"full_name":"Cy"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
grant select on t to authenticated;
select add_member_by_email((select id from t), 'b@example.com');
select set_my_avatar('00000000-0000-0000-0000-00000000000a/me.jpg');

select is((select avatar_url from trip_members where trip_id = (select id from t) and user_id = '00000000-0000-0000-0000-00000000000a'), '00000000-0000-0000-0000-00000000000a/me.jpg', 'a new picture reaches my seat on the trip');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select ok(shares_trip_with('00000000-0000-0000-0000-00000000000a'), 'a co-member shares a trip with me');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select ok(not shares_trip_with('00000000-0000-0000-0000-00000000000a'), 'a stranger does not');

select * from finish();
rollback;
