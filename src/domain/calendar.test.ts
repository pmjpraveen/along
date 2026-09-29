import { addMonths, dayLabel, daysInMonth, isoOf, monthGrid, monthTitle, parseIso, weekdayOf } from "./calendar";

test("the Figma example month: November 2022 starts on a Tuesday and has 30 days over five rows", () => {
  const grid = monthGrid({ year: 2022, month: 10 });
  expect(grid).toHaveLength(5);
  expect(grid[0]).toEqual([null, 1, 2, 3, 4, 5, 6]);
  expect(grid[4]).toEqual([28, 29, 30, null, null, null, null]);
  expect(monthTitle({ year: 2022, month: 10 })).toBe("November 2022");
});

test("every month from 2000 to 2040 lays out correctly: seven columns, each day once, in order, on the right weekday", () => {
  for (let year = 2000; year <= 2040; year++) {
    for (let month = 0; month < 12; month++) {
      const grid = monthGrid({ year, month });
      expect(grid.length).toBeGreaterThanOrEqual(4);
      expect(grid.length).toBeLessThanOrEqual(6);
      expect(grid.every((w) => w.length === 7)).toBe(true);
      const days = grid.flat().filter((d): d is number => d !== null);
      expect(days).toEqual(Array.from({ length: daysInMonth({ year, month }) }, (_, i) => i + 1));
      grid.forEach((week, r) => week.forEach((d, c) => { if (d !== null) expect(weekdayOf(year, month, d)).toBe(c); }));
    }
  }
});

test("leap years and month lengths", () => {
  expect(daysInMonth({ year: 2024, month: 1 })).toBe(29);
  expect(daysInMonth({ year: 2026, month: 1 })).toBe(28);
  expect(daysInMonth({ year: 2100, month: 1 })).toBe(28);
  expect(daysInMonth({ year: 2000, month: 1 })).toBe(29);
  expect(daysInMonth({ year: 2026, month: 8 })).toBe(30);
});

test("moving between months rolls the year", () => {
  expect(addMonths({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
  expect(addMonths({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
  expect(addMonths({ year: 2026, month: 5 }, 0)).toEqual({ year: 2026, month: 5 });
  expect(addMonths({ year: 2026, month: 5 }, -18)).toEqual({ year: 2024, month: 11 });
  expect(addMonths({ year: 2026, month: 5 }, 30)).toEqual({ year: 2028, month: 11 });
});

test("ISO dates round-trip and impossible dates are refused", () => {
  expect(isoOf(2026, 11, 5)).toBe("2026-12-05");
  expect(parseIso("2026-12-05")).toEqual({ year: 2026, month: 11, day: 5 });
  expect(parseIso("2026-02-30")).toBeNull();
  expect(parseIso("")).toBeNull();
  expect(parseIso("05-12-2026")).toBeNull();
});

test("day labels read in full for screen readers", () => {
  expect(dayLabel(2022, 10, 18)).toBe("Friday 18 November 2022");
  expect(dayLabel(2026, 11, 25)).toBe("Friday 25 December 2026");
});
