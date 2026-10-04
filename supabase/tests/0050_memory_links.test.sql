begin;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
grant select on t to authenticated;

select lives_ok($$ select add_memory((select id from t), 'link', 'l1', null, null, null, null, 'https://photos.app.goo.gl/abc123', 'Goa 2026', 'https://lh3.googleusercontent.com/x') $$, 'US-27 a member adds a Google Photos link');
select is((select link_title || ' | ' || link_url from memories where idempotency_key = 'l1'), 'Goa 2026 | https://photos.app.goo.gl/abc123', 'US-27 the link and its title are kept');
select lives_ok($$ select add_memory((select id from t), 'link', 'l2', null, null, null, null, 'https://photos.google.com/share/xyz') $$, 'US-27 a link with no preview is fine');
select lives_ok($$ select add_memory((select id from t), 'link', 'l1', null, null, null, null, 'https://photos.app.goo.gl/abc123') $$, 'US-27 a retry with the same key is accepted');
select is((select count(*)::int from memories where idempotency_key = 'l1'), 1, 'US-27 and saves one memory, not two');
select throws_ok($$ select add_memory((select id from t), 'link', 'l3', null, null, null, null, 'https://example.com/album') $$, '23514', null, 'US-27 a link to any other site is rejected');
select throws_ok($$ select add_memory((select id from t), 'link', 'l4', null, null, null, null, 'http://photos.app.goo.gl/abc') $$, '23514', null, 'US-27 a link that is not https is rejected');
select throws_ok($$ select add_memory((select id from t), 'link', 'l5') $$, '23514', null, 'US-27 a link memory needs its link');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select throws_ok($$ select add_memory((select id from t), 'link', 'l6', null, null, null, null, 'https://photos.app.goo.gl/abc') $$, '42501', null, 'US-27 someone outside the trip cannot add one');

select * from finish();
rollback;
