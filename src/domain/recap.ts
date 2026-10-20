import { formatMinor } from "./money";
import { hashSeed } from "./stampWear";
import { formatRange } from "./trip";

// The trip recap card: a playing card with the trip's length as its rank, a suit mark that is the trip's own, the total spent, who paid how much of it
// (each person's share of the expenses) and the passport stamps. Pure: the screen gives the numbers, this decides what the card says.

export const SUITS = ["compass", "sun", "wave", "peak"] as const;
export type Suit = (typeof SUITS)[number];
export const MAX_PEOPLE = 6;   // more than this shows the top five and "+N others"

export type RecapPerson = { id: string; name: string; guest: boolean; shareMinor: number; uri?: string | null };
export type RecapInput = {
  tripId: string; name: string; destination: string; start: string; end: string; completed: boolean;
  currency: { code: string; exponent: number }; totalMinor: number; people: RecapPerson[]; showAmounts: boolean;
};
export type RecapCard = {
  title: string; destination: string; range: string; rank: string; suit: Suit; soFar: boolean; stamps: boolean;
  totalMinor: number; headcount: number; people: RecapPerson[]; overflow: number;
};

const DAY = 86400000;
const utc = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));

// 1 to 30 days is the number itself, longer is a star, like a face card.
export function rankFor(start: string, end: string): string {
  const days = Math.round((utc(end) - utc(start)) / DAY) + 1;
  return days > 30 ? "★" : String(Math.max(1, days || 1));
}

export const suitFor = (tripId: string): Suit => SUITS[hashSeed(`${tripId}|suit`) % SUITS.length];

export function recapCard(i: RecapInput): RecapCard {
  // Biggest share first; ties by member id so the order never changes between renders.
  const sorted = [...i.people].sort((a, b) => b.shareMinor - a.shareMinor || (a.id < b.id ? -1 : 1));
  const over = sorted.length > MAX_PEOPLE;
  const shown = i.showAmounts ? (over ? sorted.slice(0, MAX_PEOPLE - 1) : sorted) : [];
  return {
    title: i.name, destination: i.destination, range: formatRange(i.start, i.end), rank: rankFor(i.start, i.end), suit: suitFor(i.tripId),
    soFar: !i.completed, stamps: i.completed, totalMinor: i.totalMinor, headcount: i.people.length,
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

// Where the two stamps are pressed onto the card, in the card's 360-wide units and 150 wide: arrival off the top right corner, departure off the bottom left,
// each partly cut by the edge and leaning its own way (a little different for every trip, but the same each time it is drawn).
export const STAMP_SIZE = 150;
export function stampPlacement(tripId: string): { kind: "arrival" | "departure"; x: number; y: number; tilt: number }[] {
  const r = (k: string, lo: number, hi: number) => lo + ((hashSeed(`${tripId}|${k}`) % 1000) / 1000) * (hi - lo);
  return [
    { kind: "arrival", x: 235, y: 36, tilt: r("at", -16, -6) },
    { kind: "departure", x: -30, y: 330, tilt: r("dt", 6, 16) },
  ];
}

// The recap's stamps are inked in black, blue or red only, like an office rubber stamp. Each trip has its own pair, and the two stamps never share a colour.
export const RECAP_INKS = ["#222222", "#1c3f8f", "#b3261e"] as const;
export function recapInks(tripId: string): { arrival: string; departure: string } {
  const a = hashSeed(`${tripId}|ink`) % RECAP_INKS.length;
  const d = (a + 1 + (hashSeed(`${tripId}|ink2`) % (RECAP_INKS.length - 1))) % RECAP_INKS.length;
  return { arrival: RECAP_INKS[a], departure: RECAP_INKS[d] };
}
