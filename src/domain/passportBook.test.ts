import { bookHalves, lastSpread } from "./passportBook";

test("US-31 the book is the cover and the data page, then every stamp on exactly one page, in order", () => {
  for (let n = 0; n <= 40; n++) {
    for (const per of [1, 2, 3, 4]) {
      const items = Array.from({ length: n }, (_, i) => i);
      const halves = bookHalves(items, per);
      expect(halves.slice(0, 2)).toEqual([{ kind: "cover" }, { kind: "details" }]);
      expect(halves.flatMap((p) => (p.kind === "stamps" ? p.items : []))).toEqual(items);
      expect(halves.every((p) => p.kind !== "stamps" || (p.items.length >= 1 && p.items.length <= per))).toBe(true);
    }
  }
});

test("US-31 the half list is always odd, so every spread has two pages and the closed book is the cover alone", () => {
  for (let n = 0; n <= 20; n++) expect(bookHalves(Array.from({ length: n }), 2).length % 2).toBe(1);
  expect(lastSpread(bookHalves([], 2))).toBe(1);                 // cover | details, blank
  expect(bookHalves([], 2).map((h) => h.kind)).toEqual(["cover", "details", "blank"]);
  expect(lastSpread(bookHalves([1, 2, 3, 4], 2))).toBe(2);       // cover | details, stamps 1 | stamps 2
  expect(bookHalves([1, 2, 3], 2).slice(2)).toEqual([{ kind: "stamps", items: [1, 2], page: 1 }, { kind: "stamps", items: [3], page: 2 }, { kind: "blank" }]);
});
