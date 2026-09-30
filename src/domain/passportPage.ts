import { hashSeed, rng } from "./stampWear";

// Where the stamps go on a visa page, and in what ink, worked out from the trip so a page always looks the same. A page holds ten
// stamps in two columns of five; each is nudged and tilted a little, so the page looks stamped by hand rather than laid out in a grid.
export const STAMPS_PER_PAGE = 10;
export const INKS = ["#163300", "#1c3f8f", "#7a1f6b", "#a3202a", "#0f5a5a"];   // forest, blue, purple, red, teal

export type Placement = { tilt: number; ink: string; dx: number; dy: number };

export function pages<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += STAMPS_PER_PAGE) out.push(items.slice(i, i + STAMPS_PER_PAGE));
  return out;
}

export function placement(seed: string, indexOnPage: number): Placement {
  const r = rng(hashSeed(`${seed}|${indexOnPage}`));
  return {
    tilt: Math.round((-9 + r() * 18) * 10) / 10, ink: INKS[Math.floor(r() * INKS.length)],
    dx: Math.round(-6 + r() * 12), dy: Math.round(-8 + r() * 16),
  };
}

// A wavy line across a page, as an SVG path: many of them, offset, make the guilloche pattern printed on visa pages.
export function waveLine(width: number, y: number, amp: number, waves: number): string {
  const step = width / waves;
  let d = `M0 ${y}`;
  for (let i = 0; i < waves; i++) d += ` Q ${(i + 0.5) * step} ${y + (i % 2 ? -amp : amp)} ${(i + 1) * step} ${y}`;
  return d;
}
