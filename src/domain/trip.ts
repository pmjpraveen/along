export type TripDraft = { name: string; destination: string; start: string; end: string };
export type TripErrors = Partial<Record<keyof TripDraft, string>>;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (s: string) => ISO.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().startsWith(s);

// Dates are stored as ISO (YYYY-MM-DD) and shown as DD-MM-YYYY.
export const formatDate = (iso: string) => (iso ? iso.split("-").reverse().join("-") : "");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// "9 Oct": the short day label used on the itinerary chips and under trip tiles.
export const short = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
// "08SEP26": the compact date used in the passport's machine-readable lines.
export const compactDate = (iso: string) => (iso ? `${iso.slice(8, 10)}${MONTHS[Number(iso.slice(5, 7)) - 1].toUpperCase()}${iso.slice(2, 4)}` : "");

// "25 Sep - 2 Oct": the compact range under a trip tile.
export const formatRange = (start: string, end: string) => (start && end ? `${short(start)} - ${short(end)}` : "");
export const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// `today` (ISO) is passed by the screen so a new trip cannot start in the past; omit it to skip that check.
export function validateTrip(d: TripDraft, today?: string): TripErrors {
  const e: TripErrors = {};
  if (!d.name.trim()) e.name = "Give your trip a name.";
  if (!d.destination.trim()) e.destination = "Where are you going?";
  if (!validDate(d.start)) e.start = "Pick a start date.";
  else if (today && d.start < today) e.start = "Start date can't be in the past.";
  if (!validDate(d.end)) e.end = "Pick an end date.";
  else if (!e.start && d.end < d.start) e.end = "End date can't be before the start date.";
  return e;
}

// Trips that are happening now come first; every other trip keeps the order it already had.
export function ongoingFirst<T extends { phase: string }>(trips: T[]): T[] {
  return [...trips.filter((t) => t.phase === "active"), ...trips.filter((t) => t.phase !== "active")];
}

// The six colours a completed trip's card can take (from the design), in the design's order.
export const CARD_COLORS = ["#ffc091", "#e5ebff", "#ebe0d9", "#d9e0ab", "#def6ff", "#fff27b"] as const;

// Colours are handed out in order, oldest trip first, so any six trips in a row show all six colours. `newestFirst` is the trip's place in a
// newest-first list of `count` trips; counting from the oldest end means a newer trip never changes the colour of an older one.
export function cardColorAt(newestFirst: number, count: number, chosen?: number | null): string {
  if (chosen !== null && chosen !== undefined && chosen >= 0 && chosen < CARD_COLORS.length) return CARD_COLORS[chosen];   // the owner picked one
  return CARD_COLORS[(count - 1 - newestFirst) % CARD_COLORS.length];
}
