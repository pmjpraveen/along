import { hashSeed } from "./stampWear";

// A trip's two stamps (arrival and departure) are a matching pair: the same frame and the same ink, so they read as belonging together in the passport. The frame is one of six
// double-line shapes (rounded rectangle, cut-corner shield, arch, hexagon, oval, circle) and the ink is one of seven, both taken from the trip's id so a trip always looks the same.
export const SHAPES = ["rect", "chamfer", "arch", "hexagon", "oval", "circle"] as const;
export type StampShape = (typeof SHAPES)[number];
export type StampKind = "arrival" | "departure";

export const STAMP_INKS = ["#1c3f8f", "#1f7a5a", "#a3402a", "#6b2a7a", "#8c1f2a", "#b8581c", "#2a4a8a"] as const;   // blue, green, brick, purple, crimson, orange, navy

// Every stamp has its own shape (a trip's arrival and departure never match) and its own size, as when stamps are pressed by different officers with different stamps.
export const shapeFor = (seed: string, kind: StampKind): StampShape => {
  const h = hashSeed(seed);
  const arrival = SHAPES[h % SHAPES.length];
  return kind === "arrival" ? arrival : SHAPES[(h % SHAPES.length + 1 + ((h >>> 7) % (SHAPES.length - 1))) % SHAPES.length];
};
// How big a stamp is pressed, as a share of the page's stamp size (about 0.85 to 1.2).
export const sizeFor = (seed: string, kind: StampKind): number => 0.85 + ((hashSeed(`${seed}|${kind}|size`) >>> 3) % 36) / 100;
// The arrival and the departure of one trip are pressed with different inks (a few steps apart on the list, so they never look alike).
export const inkFor = (seed: string, kind: StampKind): string => STAMP_INKS[((hashSeed(seed) >>> 4) + (kind === "departure" ? 3 : 0)) % STAMP_INKS.length];

// "10 JUN 2026", the way a border stamp prints a date.
const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
export const stampDate = (iso: string) => (iso ? `${iso.slice(8, 10)} ${MON[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}` : "");

export type TripStamp = { id: string; trip_id: string; destination_name: string; start_date: string; end_date: string };
export type Impression = { key: string; tripId: string; destination: string; kind: StampKind; date: string; shape: StampShape; ink: string; scale: number };

// Each completed trip leaves two impressions in the passport: arrival on its first day and departure on its last, newest trip first
// with its departure above its arrival.
export function impressions(stamps: TripStamp[]): Impression[] {
  return stamps.flatMap((s) => [
    { key: `${s.id}-out`, tripId: s.trip_id, destination: s.destination_name, kind: "departure" as const, date: s.end_date, shape: shapeFor(s.id, "departure"), ink: inkFor(s.id, "departure"), scale: sizeFor(s.id, "departure") },
    { key: `${s.id}-in`, tripId: s.trip_id, destination: s.destination_name, kind: "arrival" as const, date: s.start_date, shape: shapeFor(s.id, "arrival"), ink: inkFor(s.id, "arrival"), scale: sizeFor(s.id, "arrival") },
  ]);
}
