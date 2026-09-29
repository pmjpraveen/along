export type TripDraft = { name: string; destination: string; start: string; end: string };
export type TripErrors = Partial<Record<keyof TripDraft, string>>;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (s: string) => ISO.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().startsWith(s);

// Dates are stored as ISO (YYYY-MM-DD) and shown as DD-MM-YYYY.
export const formatDate = (iso: string) => (iso ? iso.split("-").reverse().join("-") : "");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
// "25 Sep - 2 Oct": the compact range under a trip tile.
export const formatRange = (start: string, end: string) => (start && end ? `${short(start)} - ${short(end)}` : "");
export const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function validateTrip(d: TripDraft): TripErrors {
  const e: TripErrors = {};
  if (!d.name.trim()) e.name = "Give your trip a name.";
  if (!d.destination.trim()) e.destination = "Where are you going?";
  if (!validDate(d.start)) e.start = "Pick a start date.";
  if (!validDate(d.end)) e.end = "Pick an end date.";
  else if (!e.start && d.end < d.start) e.end = "End date can't be before the start date.";
  return e;
}
