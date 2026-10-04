import { signAvatars } from "./profile";
import { supabase } from "./supabase";

export type Member = { id: string; display_name: string; membership_type: "registered" | "guest"; role: "owner" | "member" | "guest"; isMe?: boolean; avatarUrl?: string | null };
export type MembersResult = { ok: true; members: Member[] } | { ok: false; message: string };
export type AddGuestResult = { ok: true } | { ok: false; message: string };

const OFFLINE = "You're offline. Check your connection and try again.";
const isOffline = (m: string) => /network|fetch/i.test(m);

export async function listMembers(tripId: string): Promise<MembersResult> {
  try {
    const [res, session] = await Promise.all([
      supabase.from("trip_members").select("id, user_id, display_name, membership_type, role, avatar_url").eq("trip_id", tripId).neq("status", "removed").order("created_at"),
      supabase.auth.getSession(),
    ]);
    if (res.error) return { ok: false, message: isOffline(res.error.message) ? OFFLINE : "Couldn't load people. Try again." };
    const me = session.data.session?.user.id;
    const urls = await signAvatars((res.data ?? []).map((m) => m.avatar_url));
    const members = (res.data ?? []).map(({ user_id, avatar_url, ...m }) => ({ ...m, isMe: !!me && user_id === me, avatarUrl: urls.get(avatar_url) ?? null }));
    return { ok: true, members: members as Member[] };
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

export type RemoveGuestResult = { ok: true } | { ok: false; message: string };

// The owner deletes a guest who has not joined. Their history stays; the server refuses anyone who has joined.
export async function removeGuest(memberId: string): Promise<RemoveGuestResult> {
  try {
    const { error } = await supabase.rpc("remove_member", { p_member: memberId });
    if (!error) return { ok: true };
    if (isOffline(error.message)) return { ok: false, message: OFFLINE };
    if (error.message === "only_guests_can_be_removed") return { ok: false, message: "Only guests who haven't joined can be deleted." };
    return { ok: false, message: error.code === "42501" ? "Only the trip owner can delete guests." : "Couldn't delete the guest. Try again." };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

export type AddMemberResult = { ok: true; name: string } | { ok: false; message: string };

// Adds someone who already uses along straight to the trip by their email, no invite link needed. The owner only.
export async function addMemberByEmail(tripId: string, email: string): Promise<AddMemberResult> {
  try {
    const { data, error } = await supabase.rpc("add_member_by_email", { p_trip: tripId, p_email: email });
    if (!error) return { ok: true, name: String(data) };
    if (isOffline(error.message)) return { ok: false, message: OFFLINE };
    if (error.message === "user_not_found") return { ok: false, message: "No one on along uses that email. Add them as a guest and send an invite instead." };
    if (error.message === "already_member") return { ok: false, message: "They're already on this trip." };
    return { ok: false, message: error.code === "42501" ? "Only the trip owner can add people." : "Couldn't add them. Try again." };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}
