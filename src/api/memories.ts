import { LinkPreview, parseLinkPreview } from "../domain/googlePhotos";
import { signAvatars } from "./profile";
import { supabase } from "./supabase";

const OFFLINE = "You're offline. Check your connection and try again.";
const isOffline = (m: string) => /network|fetch/i.test(m);

export type Memory = {
  id: string; type: "photo" | "note" | "favorite_place" | "link"; caption: string | null; body: string | null; place_name: string | null;
  created_at: string; author: string; authorAvatar?: string | null; photoUrl: string | null; linkUrl: string | null; linkTitle: string | null; linkImage: string | null; canManage: boolean;
};
export type MemoriesResult = { ok: true; memories: Memory[] } | { ok: false; message: string };
export type SaveResult = { ok: true } | { ok: false; message: string };

// Newest first. Photos are private, so each one is shown through a short-lived signed link.
export async function listMemories(tripId: string): Promise<MemoriesResult> {
  try {
    const [rows, members, session] = await Promise.all([
      supabase.from("memories").select("id, type, media_path, caption, body, place_name, link_url, link_title, link_image_url, created_at, created_by_member_id")
        .eq("trip_id", tripId).is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("trip_members").select("id, user_id, role, display_name, avatar_url").eq("trip_id", tripId),
      supabase.auth.getSession(),
    ]);
    const err = rows.error ?? members.error;
    if (err) return { ok: false, message: isOffline(err.message) ? OFFLINE : "Couldn't load memories. Try again." };
    const paths = (rows.data ?? []).map((r) => r.media_path).filter(Boolean) as string[];
    const urls = new Map<string, string>();
    if (paths.length) {
      const signed = await supabase.storage.from("memories").createSignedUrls(paths, 3600);
      for (const s of signed.data ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
    }
    const name = new Map((members.data ?? []).map((m) => [m.id as string, m.display_name as string]));
    const avatars = await signAvatars((members.data ?? []).map((m) => m.avatar_url));
    const avatarOf = new Map((members.data ?? []).map((m) => [m.id as string, avatars.get(m.avatar_url) ?? null]));
    // Only the person who added a memory, or the trip owner, can change or delete it (the server enforces the same rule).
    const me = (members.data ?? []).find((m) => m.user_id === session.data.session?.user.id);
    return {
      ok: true,
      memories: (rows.data ?? []).map((r) => ({
        id: r.id, type: r.type, caption: r.caption, body: r.body, place_name: r.place_name, created_at: r.created_at,
        author: name.get(r.created_by_member_id) ?? "Someone", authorAvatar: avatarOf.get(r.created_by_member_id) ?? null, photoUrl: r.media_path ? urls.get(r.media_path) ?? null : null,
        linkUrl: r.link_url, linkTitle: r.link_title, linkImage: r.link_image_url,
        canManage: !!me && (me.role === "owner" || me.id === r.created_by_member_id),
      })),
    };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

const fail = (message: string): SaveResult => ({ ok: false, message });

// The key is minted by the screen and reused on retry, so a retried tap saves one memory.
export async function addNote(tripId: string, text: string, key: string): Promise<SaveResult> {
  try {
    const { error } = await supabase.rpc("add_memory", { p_trip: tripId, p_type: "note", p_idempotency_key: key, p_body: text });
    if (!error) return { ok: true };
    return fail(isOffline(error.message) ? OFFLINE : "Couldn't save the note. Try again.");
  } catch {
    return fail(OFFLINE);
  }
}

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };

// Uploads into the trip's folder, then records the memory. The path comes from the key, so a retry overwrites the same file
// instead of leaving a second one, and the memory itself is deduplicated by the same key.
export async function addPhoto(tripId: string, uri: string, mimeType: string, key: string, caption?: string): Promise<SaveResult> {
  try {
    if (!EXT[mimeType]) return fail("Choose a JPEG, PNG, WebP or HEIC photo.");
    const path = `${tripId}/${key}.${EXT[mimeType]}`;
    const bytes = await (await fetch(uri)).arrayBuffer();
    const up = await supabase.storage.from("memories").upload(path, bytes, { contentType: mimeType, upsert: true });
    if (up.error) return fail(isOffline(up.error.message) ? OFFLINE : "Couldn't upload the photo. Try again.");
    const { error } = await supabase.rpc("add_memory", { p_trip: tripId, p_type: "photo", p_idempotency_key: key, p_media_path: path, p_caption: caption ?? null });
    if (!error) return { ok: true };
    return fail(isOffline(error.message) ? OFFLINE : "Couldn't save the photo. Try again.");
  } catch {
    return fail(OFFLINE);
  }
}

// The title and picture a link's page shows when shared (what chat apps use for their link cards), read once when the link is added. If the page can't
// be read in a few seconds or has no preview, the link is still saved: the card just has no picture. Never throws.
export async function previewLink(url: string): Promise<LinkPreview> {
  const none: LinkPreview = { title: null, image: null };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" } });
    if (!res.ok) return none;
    return parseLinkPreview((await res.text()).slice(0, 400_000));
  } catch {
    return none;
  } finally {
    clearTimeout(timer);
  }
}

// Saves a Google Photos link with the preview taken when it was added. The key makes a retried tap save one memory.
export async function addLink(tripId: string, url: string, key: string, preview: LinkPreview): Promise<SaveResult> {
  try {
    const { error } = await supabase.rpc("add_memory", { p_trip: tripId, p_type: "link", p_idempotency_key: key, p_link_url: url, p_link_title: preview.title, p_link_image_url: preview.image });
    if (!error) return { ok: true };
    return fail(isOffline(error.message) ? OFFLINE : "Couldn't save the link. Try again.");
  } catch {
    return fail(OFFLINE);
  }
}

// Hides a memory from the trip. The person who added it or the owner can; the server refuses anyone else.
export async function deleteMemory(memoryId: string): Promise<SaveResult> {
  try {
    const { error } = await supabase.rpc("delete_memory", { p_memory: memoryId });
    if (!error || error.code === "P0002") return { ok: true };   // already gone
    if (isOffline(error.message)) return fail(OFFLINE);
    return fail(error.code === "42501" ? "Only the person who added this or the trip owner can delete it." : "Couldn't delete the memory. Try again.");
  } catch {
    return fail(OFFLINE);
  }
}

export async function updateNote(memoryId: string, text: string): Promise<SaveResult> {
  try {
    const { error } = await supabase.rpc("update_memory_note", { p_memory: memoryId, p_body: text });
    if (!error) return { ok: true };
    if (isOffline(error.message)) return fail(OFFLINE);
    if (error.code === "22023") return fail("A note can't be empty. Delete it instead.");
    return fail(error.code === "42501" ? "Only the person who added this or the trip owner can edit it." : "Couldn't save your changes. Try again.");
  } catch {
    return fail(OFFLINE);
  }
}
