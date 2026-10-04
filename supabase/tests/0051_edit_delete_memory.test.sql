begin;
select plan(12);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"full_name":"Cy"}'),
  ('00000000-0000-0000-0000-00000000000d', 'd@example.com', '{"full_name":"Dee"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
grant select on t to authenticated;
select add_member_by_email((select id from t), 'b@example.com');
select add_member_by_email((select id from t), 'c@example.com');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
create temp table m as select
  (add_memory((select id from t), 'note', 'n1', null, null, 'Sunset at Baga')).id as note,
  (add_memory((select id from t), 'link', 'l1', null, null, null, null, 'https://photos.app.goo.gl/abc')).id as link;
grant select on m to authenticated;

select lives_ok($$ select update_memory_note((select note from m), '  Sunset at Calangute ') $$, 'US-27 the author edits their note');
select is((select body from memories where id = (select note from m)), 'Sunset at Calangute', 'US-27 the text is replaced and trimmed');
select throws_ok($$ select update_memory_note((select note from m), '   ') $$, '22023', null, 'US-27 a note cannot be emptied');
select throws_ok($$ select update_memory_note((select link from m), 'hello') $$, 'P0001', 'only notes can be edited', 'US-27 only notes can be edited');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select throws_ok($$ select update_memory_note((select note from m), 'Hijack') $$, '42501', null, 'US-27 another member cannot edit it');
select throws_ok($$ select delete_memory((select note from m)) $$, '42501', null, 'US-27 another member cannot delete it');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d"}';
select throws_ok($$ select delete_memory((select note from m)) $$, '42501', null, 'US-27 someone outside the trip cannot delete it');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select lives_ok($$ select delete_memory((select link from m)) $$, 'US-27 the author deletes their memory');
select is((select count(*)::int from memories where id = (select link from m) and deleted_at is not null), 1, 'US-27 it is hidden, not erased');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select lives_ok($$ select delete_memory((select note from m)) $$, 'US-27 the trip owner can delete anyone''s memory');
select throws_ok($$ select delete_memory((select note from m)) $$, 'P0002', null, 'US-27 deleting one that is already gone says so');

set local role anon;
select throws_ok($$ select delete_memory((select note from m)) $$, '42501', null, 'US-27 signed-out callers cannot delete');

select * from finish();
rollback;
