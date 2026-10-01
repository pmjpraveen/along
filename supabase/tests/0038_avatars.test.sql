begin;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select set_my_avatar('00000000-0000-0000-0000-00000000000a/1.jpg');
select is((select avatar_url from users where id = '00000000-0000-0000-0000-00000000000a'), '00000000-0000-0000-0000-00000000000a/1.jpg', 'I can set my own picture');
select throws_ok($$ select set_my_avatar('00000000-0000-0000-0000-00000000000b/1.jpg') $$, '22023', null, 'a file in someone else''s folder is refused');
select set_my_avatar(null);
select is((select avatar_url from users where id = '00000000-0000-0000-0000-00000000000a'), null, 'and I can remove it');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select is((select avatar_url from users where id = '00000000-0000-0000-0000-00000000000a'), null, 'nobody can read another person''s row');

select * from finish();
rollback;
