import type { Item, ItemType } from "../domain/itinerary";
import type { ResolvedLocation } from "./location";
import { supabase } from "./supabase";

const OFFLINE = "You're offline. Check your connection and try again.";
const isOffline = (m: string) => /network|fetch/i.test(m);

export type TripDates = { name: string; start_date: string; end_date: string };
export type ItineraryResult = { ok: true; trip: TripDates; items: Item[] } | { ok: false; message: string };
export type CreateItemInput = { tripId: string; title: string; type: ItemType; day: string; startTime: string | null; participantIds: string[]; location?: ResolvedLocation; description?: string };
export type CreateItemResult = { ok: true } | { ok: false; message: string };

export async function loadItinerary(tripId: string): Promise<ItineraryResult> {
  try {
    const [trip, items, people, names] = await Promise.all([
      supabase.from("trips").select("name, start_date, end_date").eq("id", tripId).single(),
      supabase.from("itinerary_items_flagged")
        .select("id, version, title, type, day_date, start_time, end_time, sort_order, is_outside_trip_range, location_text, location_url, latitude, longitude, formatted_address").eq("trip_id", tripId),
      supabase.from("itinerary_participants").select("itinerary_item_id, trip_member_id").eq("trip_id", tripId),
      supabase.from("trip_members").select("id, display_name").eq("trip_id", tripId),
    ]);
    const err = trip.error ?? items.error ?? people.error ?? names.error;
    if (err) return { ok: false, message: isOffline(err.message) ? OFFLINE : "Couldn't load the itinerary. Try again." };
    const nameOf = new Map((names.data ?? []).map((m) => [m.id as string, m.display_name as string]));
    const who = new Map<string, string[]>();
    for (const p of people.data ?? []) {
      who.set(p.itinerary_item_id, [...(who.get(p.itinerary_item_id) ?? []), nameOf.get(p.trip_member_id) ?? "Someone"]);
    }
    const withPeople = (items.data ?? []).map((i) => ({ ...i, latitude: i.latitude === null ? null : Number(i.latitude), longitude: i.longitude === null ? null : Number(i.longitude), participants: who.get(i.id) ?? [] })) as Item[];
    return { ok: true, trip: trip.data as TripDates, items: withPeople };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

export async function createItem(i: CreateItemInput): Promise<CreateItemResult> {
  try {
    const { error } = await supabase.rpc("create_itinerary_item", {
      p_trip: i.tripId, p_title: i.title, p_type: i.type, p_day_date: i.day, p_start_time: i.startTime, p_participant_member_ids: i.participantIds,
      p_location_text: i.location?.text || null, p_location_url: i.location?.url ?? null,
      p_latitude: i.location?.place?.lat ?? null, p_longitude: i.location?.place?.lng ?? null,
      p_formatted_address: i.location?.place?.name ?? null, p_description: i.description?.trim() || null,
    });
    if (!error) return { ok: true };
    return { ok: false, message: isOffline(error.message) ? OFFLINE : "Couldn't save the item. Try again." };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

export async function setParticipants(itemId: string, memberIds: string[]): Promise<CreateItemResult> {
  try {
    const { error } = await supabase.rpc("set_itinerary_participants", { p_item: itemId, p_member_ids: memberIds });
    if (!error) return { ok: true };
    if (isOffline(error.message)) return { ok: false, message: OFFLINE };
    return { ok: false, message: error.code === "42501" ? "Only the creator or the trip owner can change who's joining." : "Couldn't update who's joining. Try again." };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

export type MoveResult = { ok: true } | { ok: false; message: string; stale?: true };

// Sends the version the user saw; the server rejects the move if someone edited the item since.
export async function moveItem(itemId: string, day: string, version: number): Promise<MoveResult> {
  try {
    const { error } = await supabase.rpc("move_itinerary_item", { p_item: itemId, p_day_date: day, p_version: version });
    if (!error) return { ok: true };
    if (isOffline(error.message)) return { ok: false, message: OFFLINE };
    if (error.message === "stale_version") return { ok: false, stale: true, message: "Someone else just changed this item. It's been refreshed. Try again." };
    return { ok: false, message: error.code === "42501" ? "Only the creator or the trip owner can move this item." : "Couldn't move the item. Try again." };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}
