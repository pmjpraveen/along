import { supabase } from "./supabase";

const OFFLINE = "You're offline. Check your connection and try again.";
const isOffline = (m: string) => /network|fetch/i.test(m);

export type Memory = {
  id: string; type: "photo" | "note" | "favorite_place"; caption: string | null; body: string | null; place_name: string | null;
  created_at: string; author: string; photoUrl: string | null;
};
export type MemoriesResult = { ok: true; memories: Memory[] } | { ok: false; message: string };
export type SaveResult = { ok: true } | { ok: false; message: string };

// Newest first. Photos are private, so each one is shown through a short-lived signed link.
export async function listMemories(tripId: string): Promise<MemoriesResult> {
  try {
    const [rows, members] = await Promise.all([
      supabase.from("memories").select("id, type, media_path, caption, body, place_name, created_at, created_by_member_id")
        .eq("trip_id", tripId).is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("trip_members").select("id, display_name").eq("trip_id", tripId),
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
    return {
      ok: true,
      memories: (rows.data ?? []).map((r) => ({
        id: r.id, type: r.type, caption: r.caption, body: r.body, place_name: r.place_name, created_at: r.created_at,
        author: name.get(r.created_by_member_id) ?? "Someone", photoUrl: r.media_path ? urls.get(r.media_path) ?? null : null,
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
