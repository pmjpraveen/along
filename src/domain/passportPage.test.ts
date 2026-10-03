import { INKS, placement } from "./passportPage";

test("a stamp's placement is always the same for the same trip, uses a known ink, and stays within a small tilt and nudge", () => {
  expect(placement("goa", 1)).toEqual(placement("goa", 1));
  for (const seed of ["a", "b", "c", "d", "e", "f"]) for (let i = 0; i < 12; i++) {
    const p = placement(seed, i);
    expect(INKS).toContain(p.ink);
    expect(Math.abs(p.tilt)).toBeLessThanOrEqual(9);
    expect(Math.abs(p.dx)).toBeLessThanOrEqual(6);
    expect(Math.abs(p.dy)).toBeLessThanOrEqual(8);
  }
});
