import { isMapsUrl } from "./maps";

// A place returned by a search: what to call it, where it is, and a second line to tell same-named places apart.
export type FoundPlace = { id: string; title: string; subtitle: string; lat: number; lng: number };

type Raw = { place_id?: number | string; osm_id?: number | string; name?: string; display_name?: string; lat?: string; lon?: string };

// Nominatim's display_name is "Baga Beach, Baga, Bardez, North Goa, Goa, 403516, India": the first part is the name, the rest says where.
export function toFoundPlace(r: Raw): FoundPlace | null {
  const lat = Number(r.lat);
  const lng = Number(r.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !r.display_name) return null;
  const parts = r.display_name.split(",").map((p) => p.trim()).filter(Boolean);
  const title = r.name?.trim() || parts[0];
  const rest = parts.filter((p, i) => !(i === 0 && p === title) && !/^\d+$/.test(p));
  // Keep the second line short: the two most local places and the country.
  const where = rest.length > 3 ? [rest[0], rest[rest.length - 2] ?? "", rest[rest.length - 1]].filter(Boolean) : rest;
  return { id: String(r.place_id ?? r.osm_id ?? `${lat},${lng}`), title, subtitle: where.join(", "), lat, lng };
}

// Whether what is typed is worth searching: at least three characters, and not a link (links are read, not searched).
export const isSearchable = (text: string): boolean => {
  const q = text.trim();
  return q.length >= 3 && !/^https?:\/\//i.test(q) && !isMapsUrl(q);
};
