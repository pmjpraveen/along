export type TripDraft = { name: string; destination: string; start: string; end: string };
export type TripErrors = Partial<Record<keyof TripDraft, string>>;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (s: string) => ISO.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().startsWith(s);

// Dates are stored as ISO (YYYY-MM-DD) and shown everywhere as "1 Oct", ranges as "1 Oct - 7 Oct".
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// "9 Oct": the short day label used on the itinerary chips and under trip tiles.
export const short = (iso: string) => (iso ? `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}` : "");
export const formatDate = short;
// "1 Oct 2026": for dates with no trip around them, like when you joined.
export const longDate = (iso: string) => (iso ? `${short(iso)} ${iso.slice(0, 4)}` : "");
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

// The six colours a completed trip's card can take (from the design). The database gives each trip one when it is created; a trip stores its index, 0 to 5.
export const CARD_COLORS = ["#ffc091", "#e5ebff", "#ebe0d9", "#d9e0ab", "#def6ff", "#fff27b"] as const;
