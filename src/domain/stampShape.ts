import { hashSeed } from "./stampWear";

// Real passports mix stamp shapes and printing styles: arrival and departure are seldom the same, and each border post has its own. Ours are
// drawn in ten shapes and ten frame styles; a trip's arrival takes a shape (from its id) and its departure the next, so the two always differ,
// and every stamp takes its own frame style from what it says (see styleFor), so a stamp always looks the same.
export const SHAPES = ["rect", "oval", "circle", "hexagon", "chamfer", "octagon", "stadium", "arch", "ticket", "triangle"] as const;
export type StampShape = (typeof SHAPES)[number];
export type StampKind = "arrival" | "departure";

// How the frame is printed: a thick and a thin line, a dashed ring, a heavy line with a hairline, three fine lines, a filled label band, a dotted
// inner ring, a ring of beads, a dash-and-dot ring, a stencil of long dashes, or a slightly misregistered double strike.
export const STYLES = ["solid", "dashed", "bold", "triple", "banner", "dotted", "beaded", "dashdot", "stencil", "offset"] as const;
export type StampStyle = (typeof STYLES)[number];

// The frame style comes from the stamp's own words, so the same stamp is always printed the same way. A circle has its label on the curve, so
// it has no flat band to fill and falls back to the plain double line.
export function styleFor(seed: string, shape: StampShape): StampStyle {
  const style = STYLES[(hashSeed(seed) >>> 3) % STYLES.length];
  return style === "banner" && shape === "circle" ? "solid" : style;
}

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
