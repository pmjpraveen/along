import { INKS, pages, placement, STAMPS_PER_PAGE, waveLine } from "./passportPage";

test("stamps are split into pages of ten, in order, with a short last page", () => {
  const p = pages(Array.from({ length: 23 }, (_, i) => i));
  expect(p.map((x) => x.length)).toEqual([10, 10, 3]);
  expect(p.flat()).toEqual(Array.from({ length: 23 }, (_, i) => i));
  expect(p.every((x) => x.length <= STAMPS_PER_PAGE)).toBe(true);
  expect(pages([])).toEqual([]);
});

test("a stamp's place on the page is always the same for the same trip, uses a known ink, and stays within a small tilt", () => {
  expect(placement("goa", 1)).toEqual(placement("goa", 1));
  for (const seed of ["a", "b", "c", "d", "e", "f"]) for (let i = 0; i < STAMPS_PER_PAGE; i++) {
    const p = placement(seed, i);
    expect(INKS).toContain(p.ink);
    expect(Math.abs(p.tilt)).toBeLessThanOrEqual(9);
    expect(Math.abs(p.dx)).toBeLessThanOrEqual(6);
    expect(Math.abs(p.dy)).toBeLessThanOrEqual(8);
  }
});

test("waveLine is a closed-form path across the full width", () => {
  const d = waveLine(300, 10, 4, 6);
  expect(d.startsWith("M0 10")).toBe(true);
  expect(d.match(/Q/g)).toHaveLength(6);
  expect(d.endsWith("300 10")).toBe(true);
});
