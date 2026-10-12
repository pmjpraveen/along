import { tripDays } from "./itinerary";

export type DayExpense = { expense_date: string; amount_minor: number };
export type DayGroup<T extends DayExpense> = {
  key: string;                      // the ISO date, or "before" / "after" for dates outside the trip
  date: string | null;              // the ISO date; null for the outside groups
  dayNumber: number | null;         // Day 1, Day 2 ... within the trip; null for the outside groups
  outside: "before" | "after" | null;
  totalMinor: number;
  expenses: T[];
};

// Expenses grouped by the day they were for, newest day first, each with the day's total. A day outside the trip's dates is never hidden: dates
// before the start are grouped as "before the trip", after the end as "after the trip". Within a day the incoming order is kept.
export function groupByDay<T extends DayExpense>(expenses: T[], start: string | null | undefined, end: string | null | undefined): DayGroup<T>[] {
  const days = start && end ? tripDays(start, end) : [];
  const numberOf = new Map(days.map((d, i) => [d, i + 1]));
  const buckets = new Map<string, DayGroup<T>>();
  for (const e of expenses) {
    const inside = numberOf.has(e.expense_date);
    const outside = inside || !start || !end ? null : e.expense_date < start ? "before" as const : "after" as const;
    const key = outside ?? e.expense_date;
    let g = buckets.get(key);
    if (!g) { g = { key, date: outside ? null : e.expense_date, dayNumber: numberOf.get(e.expense_date) ?? null, outside, totalMinor: 0, expenses: [] }; buckets.set(key, g); }
    g.totalMinor += e.amount_minor;
    g.expenses.push(e);
  }
  // Newest first: after the trip, then the trip's days latest to earliest, then before the trip. Without trip dates, plain latest-first by date.
  const rank = (g: DayGroup<T>) => (g.outside === "after" ? 2 : g.outside === "before" ? 0 : 1);
  return [...buckets.values()].sort((a, b) => rank(b) - rank(a) || (b.date ?? "").localeCompare(a.date ?? ""));
}

// The days to choose from when adding an expense: every day of the trip, plus the chosen date when it is outside them, so it is never lost.
export function expenseDayChoices(start: string, end: string, chosen: string): { date: string; dayNumber: number | null }[] {
  const days = tripDays(start, end, chosen ? [chosen] : []);
  const inTrip = new Set(tripDays(start, end));
  let n = 0;
  return days.map((d) => ({ date: d, dayNumber: inTrip.has(d) ? ++n : null }));
}
