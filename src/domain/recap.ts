import { formatMinor } from "./money";
import { hashSeed } from "./stampWear";
import { formatRange } from "./trip";

// The trip recap card, a travel postcard: the front has the trip's highlights, a postage stamp and the passport stamp; the back has the total spent and
// each person's share of the expenses. Pure: the screen gives the numbers, this decides what the card says.

export const MAX_PEOPLE = 6;   // more than this shows the top five and "+N others"

export type RecapPerson = { id: string; name: string; guest: boolean; shareMinor: number; uri?: string | null };
export type RecapInput = {
  tripId: string; name: string; destination: string; start: string; end: string; completed: boolean;
  currency: { code: string; exponent: number }; totalMinor: number; people: RecapPerson[]; showAmounts: boolean;
};
export type RecapCard = {
  title: string; destination: string; range: string; soFar: boolean;
  totalMinor: number; headcount: number; people: RecapPerson[]; overflow: number;
};

const DAY = 86400000;
const utc = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));

export function recapCard(i: RecapInput): RecapCard {
  // Biggest share first; ties by member id so the order never changes between renders.
  const sorted = [...i.people].sort((a, b) => b.shareMinor - a.shareMinor || (a.id < b.id ? -1 : 1));
  const over = sorted.length > MAX_PEOPLE;
  const shown = i.showAmounts ? (over ? sorted.slice(0, MAX_PEOPLE - 1) : sorted) : [];
  return {
    title: i.name, destination: i.destination, range: formatRange(i.start, i.end),
    soFar: !i.completed, totalMinor: i.totalMinor, headcount: i.people.length,
    people: shown, overflow: i.showAmounts && over ? sorted.length - shown.length : 0,
  };
}

// The same facts as plain text, for screen readers (the card itself is a picture).
export function recapSummary(c: RecapCard, cur: { code: string; exponent: number }): string {
  const money = (n: number) => formatMinor(n, cur.exponent, cur.code);
  const who = c.people.map((p) => `${p.name} ${money(p.shareMinor)}`).join(", ");
  return `${c.title}, ${c.destination}, ${c.range}. ${c.soFar ? "Spent so far" : "Total spent"} ${money(c.totalMinor)}${who ? `. ${who}` : `. ${c.headcount} ${c.headcount === 1 ? "person" : "people"}`}${c.overflow ? `, and ${c.overflow} others` : ""}.`;
}

// How far the card leans, in degrees, for a phone turned `angle` radians from where it was when the screen opened. Held to ±max so the card stays readable.
export function clampTilt(angle: number, base: number, max = 12): number {
  "worklet";
  const deg = ((angle - base) * 180) / Math.PI;
  return Math.max(-max, Math.min(max, deg));
}

// ---- The front of the card: a name for the trip and a few facts worth posting. It is the side that goes on social media, so it carries no money and no
// names: only what the group did together. ----

export type FactExpense = { date: string; category: string };
export type Fact = { label: string; value: string; note?: string };
export type TripFacts = { tagline: string; days: number; people: number; activities: number; facts: Fact[] };

const TAGLINE: Record<string, string> = {
  food: "The foodie trip", groceries: "The cook-it-yourself trip", stay: "The comfort trip", transport: "The long way round", fuel: "The road trip",
  activities: "The adventure trip", tickets: "The big-day trip", shopping: "The shopping spree",
};
const CATEGORY: Record<string, string> = { food: "Food", groceries: "Groceries", stay: "Stay", transport: "Getting around", fuel: "Fuel", activities: "Activities", tickets: "Tickets", shopping: "Shopping", other: "Other" };

export const tripDays = (start: string, end: string) => Math.max(1, Math.round((utc(end) - utc(start)) / DAY) + 1 || 1);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// The biggest entry of a tally, ties broken by name so it never changes between renders.
function top(tally: Map<string, number>): [string, number] | null {
  let best: [string, number] | null = null;
  for (const [k, v] of tally) if (!best || v > best[1] || (v === best[1] && k < best[0])) best = [k, v];
  return best;
}

// What the group did most (counting what was logged, not what it cost), the busiest day, and the memories saved. Pure: nothing reads a clock or the network.
export function tripFacts(i: { expenses: FactExpense[]; start: string; end: string; people: number; activities: number; photos: number; memories: number; places: string[] }): TripFacts {
  const days = tripDays(i.start, i.end);
  const facts: Fact[] = [];
  let tagline = "A trip to remember";
  if (i.expenses.length > 0) {
    const byCategory = new Map<string, number>();
    const byDay = new Map<string, number>();
    for (const e of i.expenses) {
      byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + 1);
      byDay.set(e.date, (byDay.get(e.date) ?? 0) + 1);
    }
    const [cat, catN] = top(byCategory)!;
    const [day, dayN] = top(byDay)!;
    const dayNo = Math.round((utc(day) - utc(i.start)) / DAY) + 1;
    tagline = TAGLINE[cat] ?? tagline;
    if (cat !== "other") facts.push({ label: "Favourite thing", value: CATEGORY[cat] ?? "Other", note: `${plural(catN, "time", "times")} together` });
    if (dayNo >= 1 && dayNo <= days) facts.push({ label: "Busiest day", value: `Day ${dayNo}`, note: plural(dayN, "thing shared", "things shared") });
  }
  if (i.memories > 0) facts.push({ label: "Memories saved", value: String(i.memories), note: i.photos > 0 ? plural(i.photos, "photo", "photos") : undefined });
  if (i.places.length > 0) facts.push({ label: "Favourite places", value: String(i.places.length), note: i.places[0] });
  return { tagline, days, people: i.people, activities: i.activities, facts: facts.slice(0, 3) };
}

// ---- The postage stamp on the front: what is printed on it for this trip. ----

export const POSTAGE_COLORS = ["#2f7d4f", "#b5452f", "#2a4a8a", "#c27a22", "#7b3f73", "#6f7a1f"] as const;   // green, brick, blue, amber, plum, olive
export function postageSpec(i: { tripId: string; destination: string; start: string; end: string }) {
  const [city, ...rest] = i.destination.split(",").map((x) => x.trim());
  const days = tripDays(i.start, i.end);
  return {
    country: (rest.length ? rest[rest.length - 1] : city).toUpperCase(),
    city: city.toUpperCase(),
    color: POSTAGE_COLORS[hashSeed(`${i.tripId}|postage`) % POSTAGE_COLORS.length],
    value: `${days} ${days === 1 ? "DAY" : "DAYS"}`,
    year: i.end.slice(0, 4),
    postmark: `${i.end.slice(8, 10)} ${["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][Number(i.end.slice(5, 7)) - 1]} ${i.end.slice(2, 4)}`,
  };
}
