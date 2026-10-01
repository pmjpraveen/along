begin;
select plan(3);

insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select set_my_currency('USD');
select set_my_avatar('00000000-0000-0000-0000-00000000000a/1.jpg');
select lives_ok($$ select delete_my_account() $$, 'a person with a preferred currency and picture can delete their account');
select is((select preferred_currency from users where id = '00000000-0000-0000-0000-00000000000a'), null, 'the preferred currency is cleared');
select is((select avatar_url from users where id = '00000000-0000-0000-0000-00000000000a'), null, 'and so is the picture');

select * from finish();
rollback;
