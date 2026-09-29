import { sortStamps, StampRow } from "./passport";

const stamp = (id: string, start: string, awarded = "2026-12-06T10:00:00Z"): StampRow => ({ id, trip_id: `t${id}`, destination_name: id, start_date: start, end_date: start, awarded_at: awarded });

test("7.4 stamps run most recent trip first, whatever order they arrive in", () => {
  const rows = [stamp("goa", "2025-12-01"), stamp("lisbon", "2026-06-10"), stamp("ooty", "2024-05-07")];
  expect(sortStamps(rows).map((s) => s.id)).toEqual(["lisbon", "goa", "ooty"]);
  expect(sortStamps([...rows].reverse()).map((s) => s.id)).toEqual(["lisbon", "goa", "ooty"]);
});

test("7.4 two trips that started the same day order by when the stamp was awarded, latest first", () => {
  expect(sortStamps([stamp("a", "2026-06-10", "2026-06-20T00:00:00Z"), stamp("b", "2026-06-10", "2026-06-25T00:00:00Z")]).map((s) => s.id)).toEqual(["b", "a"]);
});

test("7.4 sorting does not change the list it was given", () => {
  const rows = [stamp("goa", "2025-12-01"), stamp("lisbon", "2026-06-10")];
  sortStamps(rows);
  expect(rows.map((s) => s.id)).toEqual(["goa", "lisbon"]);
});
