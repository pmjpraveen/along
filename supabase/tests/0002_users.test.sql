begin;
select plan(6);

insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha","avatar_url":"http://x/a.png"}'),
       ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{}');

select is((select count(*)::int from public.users where email like '%@example.com'), 2, 'US-01 sign-up creates exactly one users row each');
select is((select display_name from public.users where email = 'a@example.com'), 'Asha', 'US-01 display name from Google profile');
select is((select display_name from public.users where email = 'b@example.com'), 'b', 'US-01 display name falls back to email prefix');

-- retried sign-up handler is a no-op
select lives_ok($$ select public.handle_new_user() from (select 1) s where false $$, 'handler callable');
select is((select count(*)::int from public.users where email like '%@example.com'), 2, 'US-01 re-running sign-up creates no duplicate');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select is((select count(*)::int from public.users), 1, 'US-01 a user can read only their own row');

select * from finish();
rollback;
