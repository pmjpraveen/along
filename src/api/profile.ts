import { supabase } from "./supabase";

// My display name, for the greeting and the profile. Null when it can't be read; screens fall back to a plain greeting.
export async function loadMyName(): Promise<string | null> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data } = await supabase.from("users").select("display_name").eq("id", auth.user.id).maybeSingle();
    return data?.display_name ?? null;
  } catch {
    return null;
  }
}

export type MyProfile = { name: string; email: string; since: string; country: string | null };

// Everything the Profile screen shows about me. Null when it can't be read.
export async function loadMyProfile(): Promise<MyProfile | null> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data } = await supabase.from("users").select("display_name, email, created_at, country").eq("id", auth.user.id).maybeSingle();
    if (!data) return null;
    return { name: data.display_name, email: data.email, since: String(data.created_at).slice(0, 10), country: (data.country as string | null)?.trim() ?? null };
  } catch {
    return null;
  }
}

type Result = { ok: true } | { ok: false; message: string };
const OFFLINE = "No connection. Check your internet and try again.";
const isOffline = (m: string) => /network|fetch/i.test(m);

export async function setMyCountry(code: string | null): Promise<Result> {
  try {
    const { error } = await supabase.rpc("set_my_country", { p_country: code });
    if (!error) return { ok: true };
    return { ok: false, message: isOffline(error.message) ? OFFLINE : "Couldn't save your country. Try again." };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

export async function signOut(): Promise<Result> {
  try {
    const { error } = await supabase.auth.signOut();
    return error ? { ok: false, message: isOffline(error.message) ? OFFLINE : "Couldn't log out. Try again." } : { ok: true };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

// Anonymises the account on the server, then signs out. Refused while I own an open trip that other people are still on.
export async function deleteMyAccount(): Promise<Result> {
  try {
    const { error } = await supabase.rpc("delete_my_account");
    if (error) {
      if (isOffline(error.message)) return { ok: false, message: OFFLINE };
      if (error.message === "owns_open_trips") return { ok: false, message: "You still own a trip that other people are on. End the trip first, then delete your account." };
      return { ok: false, message: "Couldn't delete your account. Try again." };
    }
    await supabase.auth.signOut().catch(() => undefined);
    return { ok: true };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}
