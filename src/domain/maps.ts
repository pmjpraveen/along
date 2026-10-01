export type Place = { lat: number; lng: number; name: string | null };

const HOSTS = /^(www\.)?(google\.[a-z.]+|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl)$/i;

function toUrl(text: string): URL | null {
  try {
    const u = new URL(text.trim());
    return /^https?:$/.test(u.protocol) ? u : null;
  } catch {
    return null;
  }
}

const isMapsPath = (u: URL) => /^(www\.)?google\./i.test(u.hostname) ? u.pathname.startsWith("/maps") : u.hostname.startsWith("maps.") || u.pathname.startsWith("/maps");

const isAppleMaps = (u: URL) => /^maps\.apple\.com$/i.test(u.hostname);

// A Google Maps link of any kind (place, search, coordinates, short link), or an Apple Maps link.
export function isMapsUrl(text: string): boolean {
  const u = toUrl(text);
  return !!u && ((HOSTS.test(u.hostname) && isMapsPath(u)) || isAppleMaps(u));
}

// Short links carry no place data until they are expanded by the resolve-location-link Edge Function.
export function isShortLink(text: string): boolean {
  const u = toUrl(text);
  return !!u && /^(maps\.app\.goo\.gl|goo\.gl)$/i.test(u.hostname);
}

const num = (s: string) => Number(s);
const valid = (lat: number, lng: number) => Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

// Reads coordinates and a place name straight from a full Maps URL. Null when the URL holds neither.
// Precedence: the pinned place (!3d!4d), then the viewport (@lat,lng), then a ?q= / ?query= coordinate pair.
export function parseMapsUrl(text: string): Place | null {
  const u = toUrl(text);
  if (!u || !isMapsUrl(text)) return null;
  if (isAppleMaps(u)) return parseAppleMapsUrl(u);
  const path = decodeURIComponent(u.pathname);
  const full = decodeURIComponent(u.pathname + u.search);

  const nameMatch = path.match(/\/maps\/place\/([^/]+)/);
  const name = nameMatch ? nameMatch[1].replace(/\+/g, " ").trim() || null : null;

  const pin = full.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const view = full.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const q = (u.searchParams.get("q") ?? u.searchParams.get("query") ?? u.searchParams.get("ll") ?? "").match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  const hit = pin ?? view ?? q;
  if (!hit || !valid(num(hit[1]), num(hit[2]))) return null;
  const qText = u.searchParams.get("q") ?? u.searchParams.get("query");
  return { lat: num(hit[1]), lng: num(hit[2]), name: name ?? (qText && !q ? qText : null) };
}

// Apple Maps links carry the pin as ?coordinate=lat,lng (or ?ll=) and the place name as ?name=.
function parseAppleMapsUrl(u: URL): Place | null {
  const c = (u.searchParams.get("coordinate") ?? u.searchParams.get("ll") ?? u.searchParams.get("sll") ?? "").match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!c || !valid(num(c[1]), num(c[2]))) return null;
  return { lat: num(c[1]), lng: num(c[2]), name: u.searchParams.get("name") || u.searchParams.get("q") || null };
}

// Tapping the preview opens the user's maps app on either platform.
export const mapsOpenUrl = (p: Place) => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;

