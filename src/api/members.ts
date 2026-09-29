import { supabase } from "./supabase";

export type Member = { id: string; display_name: string; membership_type: "registered" | "guest"; role: "owner" | "member" | "guest" };
export type MembersResult = { ok: true; members: Member[] } | { ok: false; message: string };
export type AddGuestResult = { ok: true } | { ok: false; message: string };

const OFFLINE = "No connection. Check your internet and try again.";
const isOffline = (m: string) => /network|fetch/i.test(m);

export async function listMembers(tripId: string): Promise<MembersResult> {
  try {
    const { data, error } = await supabase.from("trip_members")
      .select("id, display_name, membership_type, role").eq("trip_id", tripId).neq("status", "removed").order("created_at");
    if (error) return { ok: false, message: isOffline(error.message) ? OFFLINE : "Couldn't load people. Try again." };
    return { ok: true, members: data as Member[] };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

export async function addGuest(tripId: string, name: string): Promise<AddGuestResult> {
  try {
    const { error } = await supabase.rpc("add_guest_member", { p_trip: tripId, p_display_name: name });
    if (!error) return { ok: true };
    if (isOffline(error.message)) return { ok: false, message: OFFLINE };
    return { ok: false, message: error.code === "42501" ? "Only the trip owner can add guests." : "Couldn't add the guest. Try again." };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}
