import { supabase } from "./supabase";

export type TripTable = "expenses" | "expense_participants" | "settlements" | "itinerary_items" | "trip_members" | "activity_events";

type Listener = { table: string; filter: string };

// One channel, one listener per table, each with a row filter. RLS still decides which rows a subscriber receives.
// onChange fires for every row event; onResubscribe fires when the connection comes back, so missed events are caught up.
function listen(name: string, listeners: Listener[], onChange: () => void, onResubscribe: () => void): () => void {
  let channel = supabase.channel(name);
  for (const l of listeners) channel = channel.on("postgres_changes", { event: "*", schema: "public", ...l }, onChange);
  let connectedBefore = false;
  channel.subscribe((status) => {
    if (status !== "SUBSCRIBED") return;
    if (connectedBefore) onResubscribe();
    connectedBefore = true;
  });
  return () => { supabase.removeChannel(channel); };
}

// Changes inside one trip. Returns the unsubscribe function.
export function subscribeToTrip(tripId: string, tables: TripTable[], onChange: () => void, onResubscribe: () => void): () => void {
  return listen(`trip:${tripId}:${tables.join(",")}`, tables.map((table) => ({ table, filter: `trip_id=eq.${tripId}` })), onChange, onResubscribe);
}

// The signed-in user's own notifications, across all trips.
export function subscribeToMyNotifications(onChange: () => void, onResubscribe: () => void): () => void {
  let unsubscribe = () => {};
  let cancelled = false;
  supabase.auth.getSession().then(({ data }) => {
    const uid = data.session?.user.id;
    if (uid && !cancelled) unsubscribe = listen(`notifications:${uid}`, [{ table: "notifications", filter: `user_id=eq.${uid}` }], onChange, onResubscribe);
  });
  return () => { cancelled = true; unsubscribe(); };
}
