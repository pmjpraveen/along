import { compactDate, formatDate, formatRange, toIso, validateTrip } from "./trip";

const ok = { name: "Goa", destination: "Goa, India", start: "2026-12-01", end: "2026-12-05" };

test("US-01 valid name and dates pass", () => expect(validateTrip(ok)).toEqual({}));
test("US-01 blank name is rejected", () => expect(validateTrip({ ...ok, name: "  " }).name).toBeTruthy());
test("US-01 end before start is rejected", () => expect(validateTrip({ ...ok, end: "2026-11-30" }).end).toMatch(/before/));
test("US-01 same-day trip is allowed", () => expect(validateTrip({ ...ok, end: ok.start })).toEqual({}));
test("US-01 impossible dates are rejected", () => {
  expect(validateTrip({ ...ok, start: "2026-02-30" }).start).toBeTruthy();
  expect(validateTrip({ ...ok, end: "soon" }).end).toBeTruthy();
});

test("US-01 dates display as DD-MM-YYYY and convert from a local Date", () => {
  expect(formatDate("2026-12-05")).toBe("05-12-2026");
  expect(formatDate("")).toBe("");
  expect(toIso(new Date(2026, 11, 5))).toBe("2026-12-05");
});
test("US-01 unset dates ask for a pick", () => expect(validateTrip({ ...ok, start: "" }).start).toBe("Pick a start date."));

test("formatRange shows day and month without leading zeros, and nothing when a date is missing", () => {
  expect(formatRange("2026-11-23", "2026-11-28")).toBe("23 Nov - 28 Nov");
  expect(formatRange("2026-09-05", "2026-10-02")).toBe("5 Sep - 2 Oct");
  expect(formatRange("", "2026-10-02")).toBe("");
});

test("validateTrip rejects a start date before today when today is given, and allows today itself", () => {
  const d = { name: "Goa", destination: "Goa", start: "2026-09-28", end: "2026-10-02" };
  expect(validateTrip(d, "2026-09-29").start).toBe("Start date can't be in the past.");
  expect(validateTrip({ ...d, start: "2026-09-29" }, "2026-09-29").start).toBeUndefined();
  expect(validateTrip(d).start).toBeUndefined();
});

test("compactDate writes day, month and year the way a passport's machine-readable lines do", () => {
  expect(compactDate("2026-09-08")).toBe("08SEP26");
  expect(compactDate("2025-12-31")).toBe("31DEC25");
  expect(compactDate("")).toBe("");
});
