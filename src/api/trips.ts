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

export type TripStatusResult = { ok: true; status: "draft" | "published" | "completed" | "archived"; completedAt: string | null; name: string; destination: string; coverUrl: string | null; cardColor: number } | { ok: false; message: string };
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
    const { data, error } = await supabase.from("trips").select("status, completed_at, name, destination_name, cover_url, card_color").eq("id", tripId).single();
    if (error || !data) return { ok: false, message: isOffline(error?.message ?? "") ? OFFLINE : "Couldn't load the trip. Try again." };
    const urls = await signCovers([data.cover_url]);
    return { ok: true, status: data.status, completedAt: data.completed_at, name: data.name, destination: data.destination_name, coverUrl: data.cover_url ? urls.get(data.cover_url) ?? null : null, cardColor: data.card_color };
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

export type TripCard = { id: string; name: string; destination_name: string; start_date: string; end_date: string; coverUrl: string | null; cardColor: number; phase: "draft" | "upcoming" | "active" | "completed" | "archived" };
export type TripListResult = { ok: true; trips: TripCard[] } | { ok: false; message: string };

// Every trip I am in, with where it stands (upcoming, active, completed) derived on the server from its dates and status.
export async function listTrips(): Promise<TripListResult> {
  try {
    const { data, error } = await supabase.from("trip_phase").select("id, name, destination_name, start_date, end_date, phase, cover_url, card_color").order("start_date", { ascending: false });
    if (error) return { ok: false, message: isOffline(error.message) ? OFFLINE : "Couldn't load your trips. Try again." };
    const urls = await signCovers((data ?? []).map((t) => t.cover_url));
    return { ok: true, trips: (data ?? []).map(({ cover_url, card_color, ...t }) => ({ ...t, cardColor: card_color, coverUrl: cover_url ? urls.get(cover_url) ?? null : null })) as TripCard[] };
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


export type TripSettings = { id: string; version: number; name: string; destination: string; description: string; cardColor: number; start: string; end: string; currency: string; status: "draft" | "published" | "completed" | "archived"; hasMoney: boolean; isOwner: boolean; currencies: { code: string; name: string }[] };
export type SettingsResult = { ok: true; settings: TripSettings } | { ok: false; message: string };

// What Trip settings needs: the dates, the currency (and whether it can still change), and whether I own the trip.
export async function loadTripSettings(tripId: string): Promise<SettingsResult> {
  try {
    const [trip, exp, sett, members, session, cur] = await Promise.all([
      supabase.from("trips").select("id, version, name, destination_name, description, card_color, start_date, end_date, primary_currency, status").eq("id", tripId).single(),
      supabase.from("expenses").select("id", { count: "exact", head: true }).eq("trip_id", tripId).is("deleted_at", null),
      supabase.from("settlements").select("id", { count: "exact", head: true }).eq("trip_id", tripId),
      supabase.from("trip_members").select("user_id, role").eq("trip_id", tripId),
      supabase.auth.getSession(),
      supabase.from("currencies").select("code, name").order("code"),
    ]);
    const err = trip.error ?? exp.error ?? sett.error ?? members.error ?? cur.error;
    if (err || !trip.data) return { ok: false, message: isOffline(err?.message ?? "") ? OFFLINE : "Couldn't load the trip settings. Try again." };
    const me = (members.data ?? []).find((m) => m.user_id === session.data.session?.user.id);
    return { ok: true, settings: {
      id: trip.data.id, version: trip.data.version, name: trip.data.name, destination: trip.data.destination_name, description: trip.data.description ?? "", cardColor: trip.data.card_color,
      start: trip.data.start_date, end: trip.data.end_date, currency: String(trip.data.primary_currency).trim(), status: trip.data.status,
      hasMoney: (exp.count ?? 0) > 0 || (sett.count ?? 0) > 0, isOwner: me?.role === "owner", currencies: (cur.data ?? []) as { code: string; name: string }[],
    } };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

export async function updateTripDates(tripId: string, start: string, end: string): Promise<CompleteResult> {
  try {
    const { error } = await supabase.rpc("update_trip_dates", { p_trip: tripId, p_start: start, p_end: end });
    if (!error) return { ok: true };
    if (isOffline(error.message)) return { ok: false, message: OFFLINE };
    if (error.code === "42501") return { ok: false, message: "Only the trip owner can change the dates." };
    if (error.code === "55000") return { ok: false, message: "This trip is over, so its dates can't change." };
    return { ok: false, message: "Couldn't change the dates. Try again." };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

// The owner removes the trip for everyone. The server only marks it deleted (its money rows are kept), so there is nothing to undo here.
export async function deleteTrip(tripId: string): Promise<CompleteResult> {
  try {
    const { error } = await supabase.rpc("delete_trip", { p_trip: tripId });
    if (!error) return { ok: true };
    if (isOffline(error.message)) return { ok: false, message: OFFLINE };
    if (error.code === "42501") return { ok: false, message: "Only the trip owner can delete the trip." };
    if (error.code === "P0002") return { ok: false, message: "This trip has already been deleted." };
    return { ok: false, message: "Couldn't delete the trip. Try again." };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

// Rename the trip, change where it is going and its comment. The version is the one that was read, so someone else's edit is refused, not overwritten.
export async function updateTripDetails(tripId: string, version: number, d: { name: string; destination: string; description: string }): Promise<CompleteResult> {
  try {
    const { error } = await supabase.rpc("update_trip_details", { p_trip: tripId, p_version: version, p_name: d.name, p_destination: d.destination, p_description: d.description });
    if (!error) return { ok: true };
    if (isOffline(error.message)) return { ok: false, message: OFFLINE };
    if (error.message === "stale_version") return { ok: false, message: "Someone else changed this trip. Go back and open it again to see their changes." };
    if (error.code === "23514") return { ok: false, message: "A trip needs a name and a location." };
    if (error.code === "42501") return { ok: false, message: "Only the trip owner can change the trip." };
    if (error.code === "55000") return { ok: false, message: "This trip is over, so its name and location can't change." };
    return { ok: false, message: "Couldn't save the changes. Try again." };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

// Pick one of the six card colours (0 to 5) for the trip. Every trip already has one; this changes it.
export async function setTripCardColor(tripId: string, colorIndex: number): Promise<CompleteResult> {
  try {
    const { error } = await supabase.rpc("set_trip_card_color", { p_trip: tripId, p_color: colorIndex });
    if (!error) return { ok: true };
    if (isOffline(error.message)) return { ok: false, message: OFFLINE };
    if (error.code === "42501") return { ok: false, message: "Only the trip owner can change the card colour." };
    return { ok: false, message: "Couldn't change the card colour. Try again." };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

export async function setTripCurrency(tripId: string, code: string): Promise<CompleteResult> {
  try {
    const { error } = await supabase.rpc("set_trip_currency", { p_trip: tripId, p_currency: code });
    if (!error) return { ok: true };
    if (isOffline(error.message)) return { ok: false, message: OFFLINE };
    if (error.message === "currency_locked") return { ok: false, message: "The currency can't change once expenses have been added." };
    if (error.code === "42501") return { ok: false, message: "Only the trip owner can change the currency." };
    if (error.code === "55000") return { ok: false, message: "This trip is over, so its currency can't change." };
    return { ok: false, message: "Couldn't change the currency. Try again." };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}
