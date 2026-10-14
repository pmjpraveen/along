import { impressions, inkFor, shapeFor, SHAPES, sizeFor, STAMP_INKS, stampDate } from "./stampShape";

test("a trip always gets the same frame and ink, from the six shapes and seven inks", () => {
  for (const id of ["a", "b", "goa", "ooty", "0479a6cc", "z9"]) {
    expect(shapeFor(id, "arrival")).toBe(shapeFor(id, "arrival"));
    expect(inkFor(id, "arrival")).toBe(inkFor(id, "arrival"));
    expect(SHAPES).toContain(shapeFor(id, "arrival"));
    expect(STAMP_INKS).toContain(inkFor(id, "arrival"));
    expect(inkFor(id, "departure")).not.toBe(inkFor(id, "arrival"));
  }
});

test("across many trips every shape and every ink gets used", () => {
  const shapes = new Set<string>();
  const inks = new Set<string>();
  for (let i = 0; i < 300; i++) { shapes.add(shapeFor(`trip-${i}`, "arrival")); shapes.add(shapeFor(`trip-${i}`, "departure")); inks.add(inkFor(`trip-${i}`, "arrival")); }
  expect(shapes.size).toBe(SHAPES.length);
  expect(inks.size).toBe(STAMP_INKS.length);
});

test("dates print the way a border stamp does", () => {
  expect(stampDate("2026-06-10")).toBe("10 JUN 2026");
  expect(stampDate("2025-12-01")).toBe("01 DEC 2025");
  expect(stampDate("")).toBe("");
});

test("each completed trip leaves a departure on its last day above an arrival on its first, in order, with a different frame and ink each", () => {
  const list = impressions([{ id: "a", trip_id: "t1", destination_name: "Goa", start_date: "2026-12-01", end_date: "2026-12-05" }, { id: "b", trip_id: "t2", destination_name: "Ooty", start_date: "2026-05-07", end_date: "2026-05-09" }]);
  expect(list.map((x) => [x.destination, x.kind, x.date])).toEqual([["Goa", "departure", "2026-12-05"], ["Goa", "arrival", "2026-12-01"], ["Ooty", "departure", "2026-05-09"], ["Ooty", "arrival", "2026-05-07"]]);
  expect(new Set(list.map((x) => x.key)).size).toBe(4);
  expect(list[0].shape).not.toBe(list[1].shape);
  expect(list[0].ink).not.toBe(list[1].ink);
});

test("US-31 every stamp is pressed at its own size, between about 0.85 and 1.2 of the page's stamp size, the same every time", () => {
  const sizes = new Set<number>();
  for (let i = 0; i < 100; i++) for (const kind of ["arrival", "departure"] as const) {
    const s = sizeFor(`trip-${i}`, kind);
    expect(s).toBeGreaterThanOrEqual(0.85); expect(s).toBeLessThanOrEqual(1.2);
    expect(sizeFor(`trip-${i}`, kind)).toBe(s);
    sizes.add(s);
  }
  expect(sizes.size).toBeGreaterThan(10);
});
