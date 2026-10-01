-- Sample data for the App Store review account: two trips (one in progress, one completed) with guests, plans, expenses, a payment and a
-- memory, so a reviewer sees every part of the app. Not a migration; run it once, by hand, after creating the review user.
--
--   1. Supabase dashboard > Authentication > Users > Add user (tick "Auto Confirm User"), with the email below and a password you choose.
--   2. Set review_email below to that email.
--   3. supabase db query --linked -f supabase/review-seed.sql          (or --local to try it against the local database)
--
-- It acts as that user through the same functions the app calls, so every rule (splits must add up, one owner, and so on) is checked. It
-- refuses to run twice for the same user.

do $$
declare
  review_email constant text := 'review@getalong.xyz';
  uid uuid;
  goa uuid; coorg uuid;
  me_goa uuid; rahul uuid; meera uuid;
  me_coorg uuid; kiran uuid;
begin
  select id into uid from auth.users where lower(email) = lower(review_email);
  if uid is null then raise exception 'No user with the email %: create it in Authentication > Users first.', review_email; end if;
  if exists (select 1 from trip_members where user_id = uid) then raise exception '% already has trips; nothing was added.', review_email; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);

  -- Trip 1: in progress, 3 people, plans and expenses.
  goa := (create_trip('Goa beach weekend', 'Goa, India', current_date - 1, current_date + 3, 'INR', 'review-goa')).id;
  me_goa := my_member_id(goa);
  rahul := (add_guest_member(goa, 'Rahul')).id;
  meera := (add_guest_member(goa, 'Meera')).id;

  perform create_itinerary_item(goa, 'Check in at the beach hut', 'stay', current_date - 1, '14:00', null);
  perform create_itinerary_item(goa, 'Sunset at Baga Beach', 'place', current_date - 1, '17:30', '19:00');
  perform create_itinerary_item(goa, 'Seafood dinner at Fisherman''s Wharf', 'restaurant', current_date, '20:00', null);
  perform create_itinerary_item(goa, 'Scooter ride to Fort Aguada', 'activity', current_date + 1, '10:00', '13:00');
  perform create_itinerary_item(goa, 'Spice plantation tour', 'activity', current_date + 2, '09:30', null);
  perform create_itinerary_item(goa, 'Airport transfer', 'transport', current_date + 3, '11:00', null);

  perform create_expense(goa, 'Seafood dinner', 360000, current_date,
    jsonb_build_array(jsonb_build_object('member_id', me_goa, 'owed_minor', 120000),
                      jsonb_build_object('member_id', rahul, 'owed_minor', 120000),
                      jsonb_build_object('member_id', meera, 'owed_minor', 120000)), 'review-goa-e1');
  perform create_expense(goa, 'Scooter rental', 90000, current_date - 1,
    jsonb_build_array(jsonb_build_object('member_id', me_goa, 'owed_minor', 45000),
                      jsonb_build_object('member_id', rahul, 'owed_minor', 45000)), 'review-goa-e2', rahul);
  perform create_expense(goa, 'Beach hut, 4 nights', 800000, current_date - 1,
    jsonb_build_array(jsonb_build_object('member_id', me_goa, 'owed_minor', 266667),
                      jsonb_build_object('member_id', rahul, 'owed_minor', 266667),
                      jsonb_build_object('member_id', meera, 'owed_minor', 266666)), 'review-goa-e3');
  perform create_settlement(goa, meera, me_goa, 100000, 'review-goa-s1');
  perform add_memory(goa, 'note', 'review-goa-m1', null, null, 'Sunset at Baga was unreal. Best first evening.', null);

  -- Trip 2: completed, so Home shows the empty state with "See completed trips", and the passport has stamps.
  coorg := (create_trip('Coorg road trip', 'Coorg, India', current_date - 40, current_date - 36, 'INR', 'review-coorg')).id;
  me_coorg := my_member_id(coorg);
  kiran := (add_guest_member(coorg, 'Kiran')).id;
  perform create_itinerary_item(coorg, 'Coffee estate walk', 'activity', current_date - 39, '08:00', null);
  perform create_itinerary_item(coorg, 'Abbey Falls', 'place', current_date - 38, '11:00', null);
  perform create_expense(coorg, 'Petrol', 250000, current_date - 40,
    jsonb_build_array(jsonb_build_object('member_id', me_coorg, 'owed_minor', 125000),
                      jsonb_build_object('member_id', kiran, 'owed_minor', 125000)), 'review-coorg-e1');
  perform create_expense(coorg, 'Homestay', 600000, current_date - 39,
    jsonb_build_array(jsonb_build_object('member_id', me_coorg, 'owed_minor', 300000),
                      jsonb_build_object('member_id', kiran, 'owed_minor', 300000)), 'review-coorg-e2', kiran);
  perform add_memory(coorg, 'note', 'review-coorg-m1', null, null, 'Mist over the coffee estates at 7am. Worth the early start.', null);
  perform complete_trip(coorg);
end $$;
