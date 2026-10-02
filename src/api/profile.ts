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

export type MyProfile = { name: string; email: string; since: string; country: string | null; avatarUrl: string | null; currency: string | null };

// avatar_url is a storage path in the private 'avatars' bucket; sign it for display.
export async function signAvatar(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  return (await signAvatars([path])).get(path) ?? null;
}

// Signed links are reused for most of their hour, and any that are missing are signed in one request, not one per person.
const signed = new Map<string, { url: string; at: number }>();
export async function signAvatars(paths: (string | null | undefined)[]): Promise<Map<string, string>> {
  const now = Date.now();
  const out = new Map<string, string>();
  const need = new Set<string>();
  for (const p of paths) {
    if (!p) continue;
    const hit = signed.get(p);
    if (hit && now - hit.at < 50 * 60 * 1000) out.set(p, hit.url); else need.add(p);
  }
  if (need.size) {
    try {
      const { data } = await supabase.storage.from("avatars").createSignedUrls([...need], 3600);
      for (const r of data ?? []) if (r.path && r.signedUrl) { signed.set(r.path, { url: r.signedUrl, at: now }); out.set(r.path, r.signedUrl); }
    } catch {
      // no picture is shown; initials stand in
    }
  }
  return out;
}

// My picture for the Home corner. Null when I have none or it can't be read.
export async function loadMyAvatar(): Promise<string | null> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data } = await supabase.from("users").select("avatar_url").eq("id", auth.user.id).maybeSingle();
    return await signAvatar(data?.avatar_url);
  } catch {
    return null;
  }
}

// Everything the Profile screen shows about me. Null when it can't be read.
export async function loadMyProfile(): Promise<MyProfile | null> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data } = await supabase.from("users").select("display_name, email, created_at, country, avatar_url, preferred_currency").eq("id", auth.user.id).maybeSingle();
    if (!data) return null;
    return { name: data.display_name, email: data.email, since: String(data.created_at).slice(0, 10), country: (data.country as string | null)?.trim() ?? null, avatarUrl: await signAvatar(data.avatar_url), currency: (data.preferred_currency as string | null)?.trim() ?? null };
  } catch {
    return null;
  }
}

type Result = { ok: true } | { ok: false; message: string };
const OFFLINE = "You're offline. Check your connection and try again.";
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
    // The account is anonymised; now remove my profile picture files too (best effort, the sign-in token is still valid for a moment).
    try {
      const { data: auth } = await supabase.auth.getUser();
      const folder = auth.user?.id;
      if (folder) {
        const { data: files } = await supabase.storage.from("avatars").list(folder);
        if (files?.length) await supabase.storage.from("avatars").remove(files.map((f) => `${folder}/${f.name}`));
      }
    } catch { /* the account is already anonymised; leftover files are unreachable */ }
    await supabase.auth.signOut().catch(() => undefined);
    return { ok: true };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };

// Uploads a photo into my own folder (a new name each time, so a new picture is never a stale cached one) and makes it my picture.
export async function uploadAvatar(uri: string, mimeType: string): Promise<Result> {
  try {
    if (!EXT[mimeType]) return { ok: false, message: "Choose a JPEG, PNG, WebP or HEIC photo." };
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { ok: false, message: "Couldn't update your picture. Try again." };
    const path = `${auth.user.id}/${Date.now()}.${EXT[mimeType]}`;
    const bytes = await (await fetch(uri)).arrayBuffer();
    const up = await supabase.storage.from("avatars").upload(path, bytes, { contentType: mimeType, upsert: true });
    if (up.error) return { ok: false, message: isOffline(up.error.message) ? OFFLINE : "Couldn't upload the photo. Try again." };
    const { error } = await supabase.rpc("set_my_avatar", { p_path: path });
    return error ? { ok: false, message: isOffline(error.message) ? OFFLINE : "Couldn't update your picture. Try again." } : { ok: true };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

export type Currency = { code: string; name: string };

export async function listCurrencies(): Promise<Currency[]> {
  try {
    const { data } = await supabase.from("currencies").select("code, name").order("code");
    return (data ?? []) as Currency[];
  } catch {
    return [];
  }
}

// The currency new trips start with. Existing trips keep theirs.
export async function setMyCurrency(code: string | null): Promise<Result> {
  try {
    const { error } = await supabase.rpc("set_my_currency", { p_currency: code });
    if (!error) return { ok: true };
    return { ok: false, message: isOffline(error.message) ? OFFLINE : "Couldn't save your currency. Try again." };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}
