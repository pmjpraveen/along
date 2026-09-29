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

export type TripStatusResult = { ok: true; status: "draft" | "published" | "completed" | "archived"; completedAt: string | null } | { ok: false; message: string };
export type CompleteResult = { ok: true } | { ok: false; message: string };

const OFFLINE = "No connection. Check your internet and try again.";
const isOffline = (m: string) => /network|fetch/i.test(m);

export async function loadTripStatus(tripId: string): Promise<TripStatusResult> {
  try {
    const { data, error } = await supabase.from("trips").select("status, completed_at").eq("id", tripId).single();
    if (error || !data) return { ok: false, message: isOffline(error?.message ?? "") ? OFFLINE : "Couldn't load the trip. Try again." };
    return { ok: true, status: data.status, completedAt: data.completed_at };
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
