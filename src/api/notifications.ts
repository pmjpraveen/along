import type { Notification, NotificationType } from "../domain/notifications";
import { supabase } from "./supabase";

const OFFLINE = "You're offline. Check your connection and try again.";
const isOffline = (m: string) => /network|fetch/i.test(m);

export type InboxResult = { ok: true; items: Notification[]; enabled: Record<NotificationType, boolean> } | { ok: false; message: string };
export type ActionResult = { ok: true } | { ok: false; message: string };

// Own notifications, newest first, plus the user's default on/off choice per type (no row means on).
export async function loadInbox(): Promise<InboxResult> {
  try {
    const [list, prefs] = await Promise.all([
      supabase.from("notifications").select("id, trip_id, type, payload, read_at, created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("notification_preferences").select("type, enabled").is("trip_id", null),
    ]);
    const err = list.error ?? prefs.error;
    if (err) return { ok: false, message: isOffline(err.message) ? OFFLINE : "Couldn't load notifications. Try again." };
    const enabled = { trip_invitation: true, itinerary_change: true, new_expense: true, balance_change: true, settlement_update: true } as Record<NotificationType, boolean>;
    for (const p of prefs.data ?? []) enabled[p.type as NotificationType] = p.enabled;
    return { ok: true, items: list.data as Notification[], enabled };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

// Just the on/off choice per type, for Settings (no row means on).
export async function loadPreferences(): Promise<{ ok: true; enabled: Record<NotificationType, boolean> } | { ok: false; message: string }> {
  try {
    const { data, error } = await supabase.from("notification_preferences").select("type, enabled").is("trip_id", null);
    if (error) return { ok: false, message: isOffline(error.message) ? OFFLINE : "Couldn't load your choices. Try again." };
    const enabled = { trip_invitation: true, itinerary_change: true, new_expense: true, balance_change: true, settlement_update: true } as Record<NotificationType, boolean>;
    for (const p of data ?? []) enabled[p.type as NotificationType] = p.enabled;
    return { ok: true, enabled };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

export async function markRead(id: string): Promise<ActionResult> {
  try {
    const { error } = await supabase.rpc("mark_notification_read", { p_id: id });
    return error ? { ok: false, message: isOffline(error.message) ? OFFLINE : "Couldn't update. Try again." } : { ok: true };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

export async function setPreference(type: NotificationType, enabled: boolean): Promise<ActionResult> {
  try {
    const { error } = await supabase.rpc("set_notification_preference", { p_type: type, p_enabled: enabled });
    return error ? { ok: false, message: isOffline(error.message) ? OFFLINE : "Couldn't save your choice. Try again." } : { ok: true };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

export async function unreadCount(): Promise<number> {
  try {
    const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
    return count ?? 0;
  } catch {
    return 0;
  }
}
