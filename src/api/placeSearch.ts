import { FoundPlace, toFoundPlace } from "../domain/places";

// Place search on OpenStreetMap's Nominatim. It is a free public service with a usage policy: at most one request a second, an
// identifying app name, and no search-as-you-type on every keystroke, so callers wait for a pause in typing (see usePlaceSearch).
// It is behind this one function so it can be swapped for another provider without touching any screen.
const URL_BASE = "https://nominatim.openstreetmap.org/search";
export type PlaceSearchResult = { ok: true; places: FoundPlace[] } | { ok: false; message: string };

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceSearchResult> {
  try {
    const url = `${URL_BASE}?format=jsonv2&limit=6&addressdetails=0&q=${encodeURIComponent(query.trim())}`;
    const res = await fetch(url, { signal, headers: { Accept: "application/json", "User-Agent": "along-trip-app/1.0 (along.app)", "Accept-Language": "en" } });
    if (!res.ok) return { ok: false, message: res.status === 429 ? "Too many searches. Wait a moment and try again." : "Couldn't search places. Try again." };
    const data = (await res.json()) as unknown[];
    const seen = new Set<string>();
    const places = (data as Parameters<typeof toFoundPlace>[0][]).map(toFoundPlace).filter((p): p is FoundPlace => !!p && !seen.has(p.id) && !!seen.add(p.id));
    return { ok: true, places };
  } catch (e) {
    if ((e as { name?: string }).name === "AbortError") return { ok: true, places: [] };
    return { ok: false, message: "No connection. You can still type the place." };
  }
}
