begin;
select plan(3);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
grant select on t to authenticated;
select add_member_by_email((select id from t), 'b@example.com');
select is((select payload ->> 'action' from notifications where type = 'trip_invitation'), 'joined', 'the owner only gets the usual "Ben joined" update, not an "added you" one');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select is((select count(*)::int from notifications where type = 'trip_invitation'), 1, 'the person added gets one notification');
select is((select payload ->> 'actor' || ' / ' || (payload ->> 'action') from notifications where type = 'trip_invitation'), 'Asha / added', 'saying who added them');

select * from finish();
rollback;
