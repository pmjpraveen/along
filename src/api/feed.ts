import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FeedEvent } from "../domain/feed";
import { supabase } from "./supabase";

const OFFLINE = "You're offline. Check your connection and try again.";
const isOffline = (m: string) => /network|fetch/i.test(m);

export type FeedResult = { ok: true; events: FeedEvent[] } | { ok: false; message: string };

// Newest first, with the actor's name resolved.
export async function loadFeed(tripId: string): Promise<FeedResult> {
  try {
    const [events, members] = await Promise.all([
      supabase.from("activity_events").select("id, entity_type, action, actor_member_id, summary, created_at")
        .eq("trip_id", tripId).order("created_at", { ascending: false }).limit(100),
      supabase.from("trip_members").select("id, display_name").eq("trip_id", tripId),
    ]);
    const err = events.error ?? members.error;
    if (err) return { ok: false, message: isOffline(err.message) ? OFFLINE : "Couldn't load activity. Try again." };
    const name = new Map((members.data ?? []).map((m) => [m.id as string, m.display_name as string]));
    return {
      ok: true,
      events: (events.data ?? []).map((e) => ({
        id: e.id, entity_type: e.entity_type, action: e.action, created_at: e.created_at, summary: e.summary,
        actor: e.actor_member_id ? name.get(e.actor_member_id) ?? null : null,
      })),
    };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

// When this phone last opened a trip's feed. Kept on the device: it is a per-viewer convenience, not shared state.
const seenKey = (tripId: string) => `along.feedSeen.${tripId}`;
export async function lastSeen(tripId: string): Promise<string | null> {
  try { return await AsyncStorage.getItem(seenKey(tripId)); } catch { return null; }
}
export async function markSeen(tripId: string, at: string): Promise<void> {
  try { await AsyncStorage.setItem(seenKey(tripId), at); } catch { /* the marker is optional */ }
}
