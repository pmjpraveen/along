begin;
select plan(6);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select is((select display_name from users where id = '00000000-0000-0000-0000-00000000000a'), 'a', 'with no name from the token the default is the start of the email');
select lives_ok($$ select set_my_name('  Asha Rao ') $$, 'a person sets their own name');
select is((select display_name from users where id = '00000000-0000-0000-0000-00000000000a'), 'Asha Rao', 'it is trimmed and stored');
select throws_ok($$ select set_my_name('   ') $$, '22023', null, 'a blank name is refused');
select throws_ok($$ select set_my_name(repeat('x', 61)) $$, '22023', null, 'a name over 60 characters is refused');
select is((select display_name from users where id = '00000000-0000-0000-0000-00000000000b'), 'Ben', 'and nobody else''s name changes');

select * from finish();
rollback;
