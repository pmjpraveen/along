-- Live updates: clients subscribe per trip (filter trip_id=eq.<id>) and every change is checked against RLS for each
-- subscriber. Deletes in this schema are soft (updates), so the default replica identity is enough.
alter publication supabase_realtime add table expenses, expense_participants, settlements, itinerary_items, trip_members;
