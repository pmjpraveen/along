import { supabase } from "./supabase";

export type TripTable = "expenses" | "expense_participants" | "settlements" | "itinerary_items" | "trip_members";

// One channel per trip, one listener per table, each filtered to this trip. RLS still decides which rows a member receives.
// onChange fires for every row event; onResubscribe fires when the connection comes back, so missed events are caught up.
// Returns the unsubscribe function.
export function subscribeToTrip(tripId: string, tables: TripTable[], onChange: () => void, onResubscribe: () => void): () => void {
  let channel = supabase.channel(`trip:${tripId}:${tables.join(",")}`);
  for (const table of tables) {
    channel = channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `trip_id=eq.${tripId}` }, onChange);
  }
  let connectedBefore = false;
  channel.subscribe((status) => {
    if (status !== "SUBSCRIBED") return;
    if (connectedBefore) onResubscribe();
    connectedBefore = true;
  });
  return () => { supabase.removeChannel(channel); };
}
