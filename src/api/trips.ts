import type { TripDraft } from "../domain/trip";
import { supabase } from "./supabase";

export type CreateTripResult = { ok: true; tripId: string } | { ok: false; message: string };

// The key is minted once per form so a retried tap returns the same trip instead of a second one.
export async function createTrip(d: TripDraft, currency: string, idempotencyKey: string): Promise<CreateTripResult> {
  try {
    const { data, error } = await supabase.rpc("create_trip", {
      p_name: d.name, p_destination: d.destination, p_start: d.start, p_end: d.end,
      p_currency: currency, p_idempotency_key: idempotencyKey,
    });
    if (error) {
      const offline = /network|fetch/i.test(error.message);
      return { ok: false, message: offline ? "No connection. Check your internet and try again." : "Couldn't create the trip. Try again." };
    }
    return { ok: true, tripId: (data as { id: string }).id };
  } catch {
    return { ok: false, message: "No connection. Check your internet and try again." };
  }
}

export type TripStatusResult = { ok: true; status: "draft" | "published" | "completed" | "archived"; completedAt: string | null; name: string; destination: string; coverUrl: string | null } | { ok: false; message: string };
export type CompleteResult = { ok: true } | { ok: false; message: string };

const OFFLINE = "No connection. Check your internet and try again.";
const isOffline = (m: string) => /network|fetch/i.test(m);

// cover_url is a storage path in the private 'covers' bucket (signed for display) or a plain https URL (sample data).
async function signCovers(covers: (string | null)[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const paths = [...new Set(covers.filter((c): c is string => !!c))];
  for (const p of paths.filter((c) => /^https?:\/\//.test(c))) out.set(p, p);
  const stored = paths.filter((c) => !/^https?:\/\//.test(c));
  if (stored.length) {
    const signed = await supabase.storage.from("covers").createSignedUrls(stored, 3600);
    for (const x of signed.data ?? []) if (x.path && x.signedUrl) out.set(x.path, x.signedUrl);
  }
  return out;
}

export async function loadTripStatus(tripId: string): Promise<TripStatusResult> {
  try {
    const { data, error } = await supabase.from("trips").select("status, completed_at, name, destination_name, cover_url").eq("id", tripId).single();
    if (error || !data) return { ok: false, message: isOffline(error?.message ?? "") ? OFFLINE : "Couldn't load the trip. Try again." };
    const urls = await signCovers([data.cover_url]);
    return { ok: true, status: data.status, completedAt: data.completed_at, name: data.name, destination: data.destination_name, coverUrl: data.cover_url ? urls.get(data.cover_url) ?? null : null };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

// Idempotent on the server: completing an already completed trip is a no-op.
export async function completeTrip(tripId: string): Promise<CompleteResult> {
  try {
    const { error } = await supabase.rpc("complete_trip", { p_trip: tripId });
    if (!error) return { ok: true };
    if (isOffline(error.message)) return { ok: false, message: OFFLINE };
    return { ok: false, message: error.code === "42501" ? "Only the trip owner can complete this trip." : "Couldn't complete the trip. Try again." };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

// The stamp this completion earned for me, if any (it is only awarded to trips that have begun).
export async function stampForTrip(tripId: string): Promise<{ destination: string } | null> {
  try {
    const { data } = await supabase.from("passport_stamps").select("destination_name").eq("trip_id", tripId).maybeSingle();
    return data ? { destination: data.destination_name } : null;
  } catch {
    return null;
  }
}

export type TripCard = { id: string; name: string; destination_name: string; start_date: string; end_date: string; coverUrl: string | null; phase: "draft" | "upcoming" | "active" | "completed" | "archived" };
export type TripListResult = { ok: true; trips: TripCard[] } | { ok: false; message: string };

// Every trip I am in, with where it stands (upcoming, active, completed) derived on the server from its dates and status.
export async function listTrips(): Promise<TripListResult> {
  try {
    const { data, error } = await supabase.from("trip_phase").select("id, name, destination_name, start_date, end_date, phase, cover_url").order("start_date", { ascending: false });
    if (error) return { ok: false, message: isOffline(error.message) ? OFFLINE : "Couldn't load your trips. Try again." };
    const urls = await signCovers((data ?? []).map((t) => t.cover_url));
    return { ok: true, trips: (data ?? []).map(({ cover_url, ...t }) => ({ ...t, coverUrl: cover_url ? urls.get(cover_url) ?? null : null })) as TripCard[] };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };

// Uploads a photo into the trip's folder (each upload gets its own name, so a new cover is never a stale cached one) and
// makes it the cover. The owner only; the server refuses anyone else.
export async function uploadCover(tripId: string, uri: string, mimeType: string): Promise<CompleteResult> {
  try {
    if (!EXT[mimeType]) return { ok: false, message: "Choose a JPEG, PNG, WebP or HEIC photo." };
    const path = `${tripId}/${Date.now()}.${EXT[mimeType]}`;
    const bytes = await (await fetch(uri)).arrayBuffer();
    const up = await supabase.storage.from("covers").upload(path, bytes, { contentType: mimeType, upsert: true });
    if (up.error) return { ok: false, message: isOffline(up.error.message) ? OFFLINE : up.error.message.includes("row-level security") ? "Only the trip owner can change the cover." : "Couldn't upload the photo. Try again." };
    const { error } = await supabase.rpc("set_trip_cover", { p_trip: tripId, p_path: path });
    if (!error) return { ok: true };
    return { ok: false, message: isOffline(error.message) ? OFFLINE : error.code === "42501" ? "Only the trip owner can change the cover." : "Couldn't set the cover. Try again." };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}
