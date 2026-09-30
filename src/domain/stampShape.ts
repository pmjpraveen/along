import { hashSeed } from "./stampWear";

// Real passports mix stamp shapes: arrival and departure are seldom the same, and each border post has its own. Ours are drawn in five
// shapes; a trip's arrival takes one of them (from its id) and its departure the next, so the two always differ.
export const SHAPES = ["rect", "oval", "circle", "hexagon", "chamfer"] as const;
export type StampShape = (typeof SHAPES)[number];
export type StampKind = "arrival" | "departure";

export function shapeFor(seed: string, kind: StampKind): StampShape {
  const i = hashSeed(seed) % SHAPES.length;
  return SHAPES[(i + (kind === "departure" ? 1 : 0)) % SHAPES.length];
}

// "10 JUN 2026", the way a border stamp prints a date.
const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
export const stampDate = (iso: string) => (iso ? `${iso.slice(8, 10)} ${MON[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}` : "");

export type TripStamp = { id: string; trip_id: string; destination_name: string; start_date: string; end_date: string };
export type Impression = { key: string; tripId: string; destination: string; kind: StampKind; date: string; shape: StampShape };

// Each completed trip leaves two impressions in the passport: arrival on its first day and departure on its last, newest trip first
// with its departure above its arrival.
export function impressions(stamps: TripStamp[]): Impression[] {
  return stamps.flatMap((s) => [
    { key: `${s.id}-out`, tripId: s.trip_id, destination: s.destination_name, kind: "departure" as const, date: s.end_date, shape: shapeFor(s.id, "departure") },
    { key: `${s.id}-in`, tripId: s.trip_id, destination: s.destination_name, kind: "arrival" as const, date: s.start_date, shape: shapeFor(s.id, "arrival") },
  ]);
}
