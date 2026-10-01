import * as Linking from "expo-linking";
import { supabase } from "./supabase";

export type InviteLinkResult = { ok: true; url: string; token: string } | { ok: false; message: string };
export type AcceptResult = { ok: true; tripId: string } | { ok: false; message: string };

const OFFLINE = "You're offline. Check your connection and try again.";
const isOffline = (m: string) => /network|fetch/i.test(m);
const ACCEPT_ERRORS: Record<string, string> = {
  invite_not_found: "This invite link isn't valid. Ask the trip owner for a new one.",
  invite_expired: "This invite link has expired. Ask the trip owner for a new one.",
  invite_revoked: "This invite link was turned off. Ask the trip owner for a new one.",
  guest_already_claimed: "Someone already claimed this spot. Ask the trip owner to check.",
  already_member: "You're already in this trip under another name. Ask the trip owner to check.",
  invite_exhausted: "This invite link has been used up. Ask the trip owner for a new one.",
};

export type InvitePreview = { name: string; destination: string; start_date: string; end_date: string; participant_count: number; card_color?: number; invited_by?: string | null; claims_name?: string };
export type PreviewResult = { ok: true; preview: InvitePreview } | { ok: false; message: string };

const reason = (m: string) => ACCEPT_ERRORS[m];

// ponytail: custom-scheme link (along://); switch to a universal link once the domain is chosen.
export async function createInviteLink(tripId: string, claimsMemberId?: string): Promise<InviteLinkResult> {
  try {
    const { data, error } = await supabase.rpc("create_invite", { p_trip: tripId, ...(claimsMemberId && { p_claims_member: claimsMemberId }) });
    if (error) {
      if (isOffline(error.message)) return { ok: false, message: OFFLINE };
      return { ok: false, message: error.code === "42501" ? "Only the trip owner can invite people." : "Couldn't create the link. Try again." };
    }
    return { ok: true, url: Linking.createURL(`join/${data as string}`), token: data as string };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

export async function acceptInvite(token: string): Promise<AcceptResult> {
  try {
    const { data, error } = await supabase.rpc("accept_invite", { p_token: token });
    if (error) {
      if (isOffline(error.message)) return { ok: false, message: OFFLINE };
      return { ok: false, message: ACCEPT_ERRORS[error.message] ?? "Couldn't join the trip. Try again." };
    }
    return { ok: true, tripId: data as string };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

// Explicit confirmation is sent by the caller's tap; the server rejects anything without it.
export async function claimGuestProfile(token: string): Promise<AcceptResult> {
  try {
    const { data, error } = await supabase.rpc("claim_guest_profile", { p_token: token, p_confirm: true });
    if (error) {
      if (isOffline(error.message)) return { ok: false, message: OFFLINE };
      return { ok: false, message: ACCEPT_ERRORS[error.message] ?? "Couldn't claim your spot. Try again." };
    }
    return { ok: true, tripId: data as string };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

export async function previewInvite(token: string): Promise<PreviewResult> {
  try {
    const { data, error } = await supabase.rpc("preview_invite", { p_token: token });
    if (error) return { ok: false, message: isOffline(error.message) ? OFFLINE : reason(error.message) ?? "Couldn't load the invite. Try again." };
    return { ok: true, preview: data as InvitePreview };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}
