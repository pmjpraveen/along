begin;
select plan(10);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"full_name":"Cy"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
create temp table other as select (create_trip('Elsewhere', 'X', '2026-12-01', '2026-12-05', 'INR', 'k2')).id as id;
create temp table tok as select create_invite((select id from t)) as v;
grant select on t, other, tok to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select accept_invite((select v from tok));

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select lives_ok($$ insert into storage.objects (bucket_id, name, owner_id) values ('covers', (select id from t)::text || '/c1.jpg', auth.uid()::text) $$, 'the owner can upload a cover into the trip''s folder');
select is((set_trip_cover((select id from t), (select id from t)::text || '/c1.jpg')).cover_url, (select id from t)::text || '/c1.jpg', 'the owner sets the cover');
select throws_ok($$ select set_trip_cover((select id from t), (select id from other)::text || '/c1.jpg') $$, '22023', null, 'a cover must be a file in the trip''s own folder');
select throws_ok($$ select set_trip_cover((select id from t), null) $$, '22023', null, 'a cover needs a path');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select throws_ok($$ select set_trip_cover((select id from t), (select id from t)::text || '/c2.jpg') $$, '42501', null, 'a member who is not the owner cannot change the cover');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner_id) values ('covers', (select id from t)::text || '/c2.jpg', auth.uid()::text) $$, '42501', null,
  'and cannot upload one');
select is((select count(*)::int from storage.objects where bucket_id = 'covers'), 1, 'every member can see the trip''s cover file');
select is((select cover_url from trip_phase where id = (select id from t)), (select id from t)::text || '/c1.jpg', 'and the cover shows on the trip list');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select is((select count(*)::int from storage.objects where bucket_id = 'covers'), 0, 'an outsider cannot see the cover file');
select throws_ok($$ select set_trip_cover((select id from t), (select id from t)::text || '/c3.jpg') $$, '42501', null, 'an outsider cannot set a cover');

select * from finish();
rollback;
