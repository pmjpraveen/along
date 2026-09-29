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
