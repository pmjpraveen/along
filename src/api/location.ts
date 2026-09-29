import { isMapsUrl, isShortLink, parseMapsUrl, Place } from "../domain/maps";
import { supabase } from "./supabase";

// A location is what the user typed plus, when it was a Maps link we could read, the place it points at.
export type ResolvedLocation = { text: string; url: string | null; place: Place | null };

// Never fails: text that is not a Maps link, or a link that will not resolve, is kept exactly as typed.
export async function resolveLocation(input: string): Promise<ResolvedLocation> {
  const text = input.trim();
  if (!isMapsUrl(text)) return { text, url: null, place: null };
  let full = text;
  if (isShortLink(text)) {
    try {
      const { data, error } = await supabase.functions.invoke("resolve-location-link", { body: { url: text } });
      if (!error && typeof data?.final_url === "string") full = data.final_url;
    } catch {
      // fall through to following the link from the phone
    }
    // Without the Edge Function (or if it fails), the phone can follow the redirect itself: a native fetch reports the final URL.
    if (full === text) {
      try {
        const res = await fetch(text, { method: "GET" });
        if (typeof res.url === "string" && res.url) full = res.url;
      } catch {
        // keep the short link as typed
      }
    }
  }
  return { text, url: text, place: parseMapsUrl(full) };
}
