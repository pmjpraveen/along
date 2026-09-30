import { stampWear } from "./stampWear";

test("the same seed always wears the same way, and a different seed wears differently", () => {
  expect(stampWear("goa|2026", 340, 170)).toEqual(stampWear("goa|2026", 340, 170));
  expect(stampWear("goa|2026", 340, 170)).not.toEqual(stampWear("ooty|2026", 340, 170));
});

test("wear has fine grain, a few larger dropouts and a few smudges, all inside the stamp", () => {
  const w = stampWear("x", 340, 170);
  expect(w.grain.length).toBeGreaterThan(150);
  expect(w.smudges).toHaveLength(3);
  for (const g of w.grain) { expect(g.x).toBeGreaterThanOrEqual(0); expect(g.x).toBeLessThanOrEqual(340); expect(g.y).toBeLessThanOrEqual(170); }
  for (const s of w.smudges) expect(s.strength).toBeGreaterThan(0.4);
  expect(w.tilt).toBeLessThan(0);
});
