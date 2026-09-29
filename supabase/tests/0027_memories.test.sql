begin;
select plan(16);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"full_name":"Cy"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2020-12-01', '2020-12-05', 'INR', 'k1')).id as id;
create temp table other as select (create_trip('Elsewhere', 'X', '2020-12-01', '2020-12-05', 'INR', 'k2')).id as id;
create temp table tok as select create_invite((select id from t)) as v;
grant select on t, other, tok to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select accept_invite((select v from tok));

-- the trip is completed first: memories are for finished trips (and any others)
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select complete_trip((select id from t));

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select lives_ok($$ select add_memory((select id from t), 'note', 'm1', null, null, '  The sunset at Baga  ') $$, '7.3 a member adds a note to a completed trip');
select is((select body from memories where idempotency_key = 'm1'), 'The sunset at Baga', '7.3 the note is saved (trimmed)');
select is((select created_by_member_id from memories where idempotency_key = 'm1'), my_member_id((select id from t)), '7.3 attributed to the member who added it');
select is((add_memory((select id from t), 'note', 'm1', null, null, 'The sunset at Baga')).id, (select id from memories where idempotency_key = 'm1'), '7.3 a retry returns the same memory');
select is((select count(*)::int from memories), 1, '7.3 and adds no duplicate');

select lives_ok($$ select add_memory((select id from t), 'photo', 'm2', (select id from t)::text || '/beach.jpg', 'Beach') $$, '7.3 a photo memory points at a file in the trip''s folder');
select throws_ok($$ select add_memory((select id from t), 'photo', 'm3', (select id from other)::text || '/x.jpg') $$, '23514', null, '7.3 a photo cannot point at another trip''s file');
select throws_ok($$ select add_memory((select id from t), 'photo', 'm4') $$, '23514', null, '7.3 a photo needs a file');
select throws_ok($$ select add_memory((select id from t), 'note', 'm5') $$, '23514', null, '7.3 a note needs text');

-- scoped to the trip: an outsider cannot add or read
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select throws_ok($$ select add_memory((select id from t), 'note', 'm6', null, null, 'Sneaky') $$, '42501', null, '7.3 a non-member cannot add a memory');
select is((select count(*)::int from memories), 0, '7.3 a non-member cannot read the trip''s memories');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select is((select count(*)::int from memories where trip_id = (select id from other)), 0, '7.3 memories of one trip do not appear in another');
select throws_ok($$ insert into memories (trip_id, created_by_member_id, type, body) values ((select id from t), my_member_id((select id from t)), 'note', 'x') $$, '42501', null, '7.3 clients cannot write memories directly');

-- photo files: members can add and read under their trip's folder, no one else
select lives_ok($$ insert into storage.objects (bucket_id, name, owner_id) values ('memories', (select id from t)::text || '/beach.jpg', auth.uid()::text) $$, '7.3 a member can upload into their trip''s folder');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select throws_ok($$ insert into storage.objects (bucket_id, name, owner_id) values ('memories', (select id from other)::text || '/x.jpg', auth.uid()::text) $$, '42501', null,
  '7.3 but not into a trip they are not in');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select is((select count(*)::int from storage.objects where bucket_id = 'memories'), 0, '7.3 an outsider cannot see the trip''s photos');

select * from finish();
rollback;
