// The wear on an ink stamp, generated from a seed so a given stamp always wears the same way (and tests can check it).
// `grain` are tiny gaps where the ink did not take; `smudges` are soft patches where it faded or spread. Units are the stamp's own
// drawing units (a width x height box).
export type Grain = { x: number; y: number; r: number };
export type Smudge = { x: number; y: number; rx: number; ry: number; angle: number; strength: number };
export type Wear = { grain: Grain[]; smudges: Smudge[]; tilt: number };

// mulberry32: a tiny seeded random generator.
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function stampWear(seed: string, width: number, height: number): Wear {
  const r = rng(hashSeed(seed));
  const grain: Grain[] = Array.from({ length: 170 }, () => ({ x: r() * width, y: r() * height, r: 0.5 + r() * 1.3 }));
  // Bigger dropouts, a few of them, so it does not look like uniform noise.
  for (let i = 0; i < 14; i++) grain.push({ x: r() * width, y: r() * height, r: 2 + r() * 3 });
  const smudges: Smudge[] = Array.from({ length: 3 }, () => ({
    x: r() * width, y: r() * height, rx: width * (0.12 + r() * 0.18), ry: height * (0.1 + r() * 0.2), angle: r() * 180, strength: 0.45 + r() * 0.45,
  }));
  return { grain, smudges, tilt: -4 + r() * 3 };   // a slight tilt, always leaning the same way
}
