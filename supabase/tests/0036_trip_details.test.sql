begin;
select plan(13);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"full_name":"Asha"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"full_name":"Ben"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
create temp table t as select (create_trip('Goa', 'Goa', '2026-12-01', '2026-12-05', 'INR', 'k1')).id as id;
create temp table t2 as select (create_trip('Ooty', 'Ooty', '2026-12-01', '2026-12-05', 'INR', 'k2')).id as id;
create temp table tok as select create_invite((select id from t)) as v;
grant select on t, t2, tok to authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select accept_invite((select v from tok));

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select is((update_trip_details((select id from t), 1, '  Goa gang  ', ' Panjim, India ', ' Fun travel ')).name, 'Goa gang', 'the owner can rename the trip, and the name is trimmed');
select is((select description from trips where id = (select id from t)), 'Fun travel', 'and add a comment');
select is((select destination_name from trips where id = (select id from t)), 'Panjim, India', 'and change the destination');
select is((update_trip_details((select id from t), 2, 'Goa gang', 'Panjim, India', '   ')).description, null, 'a blank comment clears it');
select throws_ok($$ select update_trip_details((select id from t), 3, '   ', 'Panjim', null) $$, '23514', null, 'a blank name is refused');
select throws_ok($$ select update_trip_details((select id from t), 1, 'Stale', 'Panjim', null) $$, 'P0001', 'stale_version', 'a stale version is rejected, not silently overwritten');

select is((set_trip_card_color((select id from t), 3::smallint)).card_color, 3::smallint, 'the owner can pick a card colour');
select throws_ok($$ select set_trip_card_color((select id from t), 6::smallint) $$, '22023', null, 'a colour outside the six is refused');
select is((select card_color from trip_phase where id = (select id from t)), 3::smallint, 'the colour shows in the trip list view');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select throws_ok($$ select update_trip_details((select id from t), 4, 'Hacked', 'Anywhere', null) $$, '42501', null, 'a member who is not the owner cannot edit the trip');
select throws_ok($$ select set_trip_card_color((select id from t2), 1::smallint) $$, '42501', null, 'and cannot set the colour of another trip');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select complete_trip((select id from t2));
select throws_ok($$ select update_trip_details((select id from t2), 1, 'Renamed', 'Ooty', null) $$, '55000', null, 'a completed trip keeps its name, destination and comment');
select is((set_trip_card_color((select id from t2), 5::smallint)).card_color, 5::smallint, 'but its card colour can still be chosen');

select * from finish();
rollback;
