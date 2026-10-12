import { expenseDayChoices, groupByDay } from "./expenseDays";

const e = (id: string, date: string, amount: number) => ({ id, expense_date: date, amount_minor: amount });

test("US-07 expenses are grouped by day, newest day first, each with its total and Day number", () => {
  const g = groupByDay([e("a", "2026-12-03", 300), e("b", "2026-12-03", 200), e("c", "2026-12-01", 1000), e("d", "2026-12-02", 50)], "2026-12-01", "2026-12-05");
  expect(g.map((x) => [x.key, x.dayNumber, x.totalMinor, x.expenses.map((y) => y.id)])).toEqual([
    ["2026-12-03", 3, 500, ["a", "b"]], ["2026-12-02", 2, 50, ["d"]], ["2026-12-01", 1, 1000, ["c"]],
  ]);
});

test("US-07 a day with no expenses is simply not listed", () => {
  const g = groupByDay([e("a", "2026-12-05", 100)], "2026-12-01", "2026-12-05");
  expect(g.map((x) => x.dayNumber)).toEqual([5]);
});

test("US-07 expenses dated outside the trip are never hidden: they form 'after' and 'before' groups at the ends", () => {
  const g = groupByDay([e("in", "2026-12-02", 10), e("late", "2026-12-20", 20), e("early", "2026-11-20", 30), e("late2", "2026-12-21", 5)], "2026-12-01", "2026-12-05");
  expect(g.map((x) => [x.outside, x.dayNumber, x.totalMinor])).toEqual([["after", null, 25], [null, 2, 10], ["before", null, 30]]);
});

test("US-07 the group totals always add up to the total of all expenses, whatever the dates", () => {
  let seed = 11;
  const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  for (let round = 0; round < 300; round++) {
    const all = Array.from({ length: 1 + rnd(12) }, (_, i) => e(String(i), `2026-12-${String(1 + rnd(28)).padStart(2, "0")}`, 1 + rnd(90000)));
    const g = groupByDay(all, "2026-12-05", "2026-12-12");
    expect(g.reduce((s, x) => s + x.totalMinor, 0)).toBe(all.reduce((s, x) => s + x.amount_minor, 0));
    expect(g.reduce((s, x) => s + x.expenses.length, 0)).toBe(all.length);
  }
});

test("US-07 without trip dates the expenses are still listed, latest date first", () => {
  const g = groupByDay([e("a", "2026-12-01", 1), e("b", "2026-12-04", 2)], null, null);
  expect(g.map((x) => x.key)).toEqual(["2026-12-04", "2026-12-01"]);
});

test("US-07 the day choices are the trip's days numbered Day 1..N, plus the chosen date when it is outside, which is not given a Day number", () => {
  expect(expenseDayChoices("2026-12-01", "2026-12-03", "2026-12-02")).toEqual([
    { date: "2026-12-01", dayNumber: 1 }, { date: "2026-12-02", dayNumber: 2 }, { date: "2026-12-03", dayNumber: 3 }]);
  expect(expenseDayChoices("2026-12-01", "2026-12-03", "2026-11-28").map((x) => [x.date, x.dayNumber])).toEqual([
    ["2026-11-28", null], ["2026-12-01", 1], ["2026-12-02", 2], ["2026-12-03", 3]]);
});
