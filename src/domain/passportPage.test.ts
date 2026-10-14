import { MAX_TILT, overlaps, placement, scatter } from "./passportPage";

test("a stamp's placement is always the same for the same trip, stays within a small tilt and nudge", () => {
  expect(placement("goa", 1)).toEqual(placement("goa", 1));
  for (const seed of ["a", "b", "c", "d", "e", "f"]) for (let i = 0; i < 12; i++) {
    const p = placement(seed, i);
    expect(Math.abs(p.tilt)).toBeLessThanOrEqual(9);
    expect(Math.abs(p.dx)).toBeLessThanOrEqual(6);
    expect(Math.abs(p.dy)).toBeLessThanOrEqual(8);
  }
});

test("US-31 four stamps on a page land at different places and angles, never reversed, inside the page, never overlapping, the same every time", () => {
  for (const [w, h, size] of [[380, 270, 96], [340, 240, 84], [420, 300, 104]]) {
    for (const n of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
      const keys = [`${n}-out`, `${n}-in`, `${n}2-out`, `${n}2-in`];
      const sizes = [size, size * 0.88, size * 1.15, size * 0.95];
      const spots = scatter(keys, w, h, sizes);
      expect(scatter(keys, w, h, sizes)).toEqual(spots);
      for (const s of spots) {
        expect(s.x).toBeGreaterThan(0); expect(s.x).toBeLessThan(w);
        expect(s.y).toBeGreaterThan(0); expect(s.y).toBeLessThan(h);
        expect(Math.abs(s.rot)).toBeLessThanOrEqual(MAX_TILT);
      }
      for (let i = 0; i < spots.length; i++) for (let j = i + 1; j < spots.length; j++) {
        expect(overlaps({ ...spots[i], w: spots[i].size, h: spots[i].size * 170 / 150 }, { ...spots[j], w: spots[j].size, h: spots[j].size * 170 / 150 })).toBe(false);
      }
      expect(new Set(spots.map((s) => Math.round(s.rot))).size).toBeGreaterThan(1);
    }
  }
});
