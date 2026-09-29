begin;
select plan(2);

select is(
  array(select tablename::text from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' order by 1),
  array['activity_events', 'expense_participants', 'expenses', 'itinerary_items', 'notifications', 'settlements', 'trip_members'],
  '6.1 expenses, splits, settlements, itinerary, members, notifications and the activity feed are published to realtime');
select is((select count(*)::int from pg_publication_tables where pubname = 'supabase_realtime' and tablename in ('users', 'trip_invites')), 0,
  '6.1 users and invite tokens are never published');

select * from finish();
rollback;
