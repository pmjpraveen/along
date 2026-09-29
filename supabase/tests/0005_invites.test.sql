begin;
select plan(14);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"full_name":"Cy"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
create temp table tok as select create_invite((select id from t)) as v;
create temp table tok2 as select create_invite((select id from t), null, 1) as v;
grant select on t, tok, tok2 to authenticated;

select is((select length(v) from tok), 64, 'US-16 owner gets a token');
select throws_ok($$ select count(*) from trip_invites $$, '42501', null, 'US-16 clients cannot read the invites table');

reset role;
select is((select count(*)::int from trip_invites where token_hash = (select v from tok)), 0, 'US-16 the plaintext token is never stored');
select ok((select expires_at > now() from trip_invites where token_hash = invite_hash((select v from tok))), 'US-16 invites expire by default');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select throws_ok($$ select create_invite((select id from t)) $$, '42501', null, 'US-16 a non-member cannot create an invite');
select is(accept_invite((select v from tok)), (select id from t), 'US-16 a friend joins with the link');
select is((select role::text from trip_members where user_id = auth.uid()), 'member', 'US-16 joiner is a registered member');
select lives_ok($$ select accept_invite((select v from tok)) $$, 'US-16 accepting twice succeeds');
select is((select count(*)::int from trip_members where user_id = auth.uid()), 1, 'US-16 accepting twice creates one membership');
select throws_ok($$ select create_invite((select id from t)) $$, '42501', null, 'US-16 a plain member cannot create an invite');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select throws_ok($$ select accept_invite('nope') $$, 'P0001', 'invite_not_found', 'US-16 an unknown token is rejected');

reset role;
update trip_invites set expires_at = now() - interval '1 minute' where token_hash = invite_hash((select v from tok));
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select throws_ok($$ select accept_invite((select v from tok)) $$, 'P0001', 'invite_expired', 'US-16 an expired invite is rejected');

reset role;
update trip_invites set status = 'revoked' where token_hash = invite_hash((select v from tok2));
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select throws_ok($$ select accept_invite((select v from tok2)) $$, 'P0001', 'invite_revoked', 'US-16 a revoked invite is rejected');

set local request.jwt.claims = '{}';
select throws_ok($$ select accept_invite((select v from tok)) $$, '28000', null, 'US-16 unauthenticated accept rejected');

select * from finish();
rollback;
