import { impressions, shapeFor, SHAPES, stampDate } from "./stampShape";

test("a trip's arrival and departure never share a shape, and the same trip always gets the same ones", () => {
  for (const id of ["a", "b", "goa", "ooty", "0479a6cc", "z9"]) {
    expect(shapeFor(id, "arrival")).not.toBe(shapeFor(id, "departure"));
    expect(shapeFor(id, "arrival")).toBe(shapeFor(id, "arrival"));
    expect(SHAPES).toContain(shapeFor(id, "arrival"));
  }
});

test("different trips do not all get the same shape", () => {
  const seen = new Set(Array.from({ length: 30 }, (_, i) => shapeFor(`trip-${i}`, "arrival")));
  expect(seen.size).toBeGreaterThan(2);
});

test("dates print the way a border stamp does", () => {
  expect(stampDate("2026-06-10")).toBe("10 JUN 2026");
  expect(stampDate("2025-12-01")).toBe("01 DEC 2025");
  expect(stampDate("")).toBe("");
});

test("each completed trip leaves a departure on its last day above an arrival on its first, in order", () => {
  const list = impressions([{ id: "a", trip_id: "t1", destination_name: "Goa", start_date: "2026-12-01", end_date: "2026-12-05" }, { id: "b", trip_id: "t2", destination_name: "Ooty", start_date: "2026-05-07", end_date: "2026-05-09" }]);
  expect(list.map((x) => [x.destination, x.kind, x.date])).toEqual([["Goa", "departure", "2026-12-05"], ["Goa", "arrival", "2026-12-01"], ["Ooty", "departure", "2026-05-09"], ["Ooty", "arrival", "2026-05-07"]]);
  expect(new Set(list.map((x) => x.key)).size).toBe(4);
});
