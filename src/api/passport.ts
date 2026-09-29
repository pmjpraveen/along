import { sortStamps, StampRow } from "../domain/passport";
import { supabase } from "./supabase";

const OFFLINE = "No connection. Check your internet and try again.";
const isOffline = (m: string) => /network|fetch/i.test(m);

export type StampsResult = { ok: true; stamps: StampRow[] } | { ok: false; message: string };

// My own stamps only (RLS), newest trip first.
export async function loadStamps(): Promise<StampsResult> {
  try {
    const { data, error } = await supabase.from("passport_stamps").select("id, trip_id, destination_name, start_date, end_date, awarded_at");
    if (error) return { ok: false, message: isOffline(error.message) ? OFFLINE : "Couldn't load your passport. Try again." };
    return { ok: true, stamps: sortStamps(data as StampRow[]) };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

export type TripSummary = {
  trip_id: string; name: string; destination_name: string; start_date: string; end_date: string; status: string;
  currency: string; exponent: number; people: number; activities: number; total_spend_minor: number; outstanding_minor: number;
};
export type SummaryResult = { ok: true; summary: TripSummary } | { ok: false; message: string };

export async function loadTripSummary(tripId: string): Promise<SummaryResult> {
  try {
    const { data, error } = await supabase.from("trip_summary").select("*").eq("trip_id", tripId).maybeSingle();
    if (error) return { ok: false, message: isOffline(error.message) ? OFFLINE : "Couldn't load the trip summary. Try again." };
    if (!data) return { ok: false, message: "This trip isn't available to you any more." };
    return { ok: true, summary: { ...data, total_spend_minor: Number(data.total_spend_minor), outstanding_minor: Number(data.outstanding_minor) } as TripSummary };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}
