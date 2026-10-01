begin;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select is((select preferred_currency from users where id = '00000000-0000-0000-0000-00000000000a'), null, 'no preferred currency until one is chosen');
select set_my_currency('usd');
select is((select preferred_currency from users where id = '00000000-0000-0000-0000-00000000000a')::text, 'USD', 'I can choose one, and it is stored in capitals');
select throws_ok($$ select set_my_currency('XXX') $$, '22023', null, 'a currency the app does not know is refused');
select set_my_currency(null);
select is((select preferred_currency from users where id = '00000000-0000-0000-0000-00000000000a'), null, 'and I can clear it');

select * from finish();
rollback;
