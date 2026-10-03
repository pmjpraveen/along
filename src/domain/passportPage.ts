import { hashSeed, rng } from "./stampWear";

// How each stamp sits and in what ink, worked out from the trip so it always looks the same: nudged and tilted a little, so the stamps look
// pressed by hand rather than laid out in a grid.
export const INKS = ["#163300", "#1c3f8f", "#7a1f6b", "#a3202a", "#0f5a5a"];   // forest, blue, purple, red, teal

export type Placement = { tilt: number; ink: string; dx: number; dy: number };

export function placement(seed: string, index: number): Placement {
  const r = rng(hashSeed(`${seed}|${index}`));
  return {
    tilt: Math.round((-9 + r() * 18) * 10) / 10, ink: INKS[Math.floor(r() * INKS.length)],
    dx: Math.round(-6 + r() * 12), dy: Math.round(-8 + r() * 16),
  };
}
