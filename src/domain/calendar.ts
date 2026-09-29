// Pure calendar maths for the date picker. Weeks start on Monday, as in the design system's calendar. Months are 0-11.
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;
const LONG_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export type Ym = { year: number; month: number };

const pad = (n: number) => String(n).padStart(2, "0");
export const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
export const daysInMonth = ({ year, month }: Ym) => new Date(year, month + 1, 0).getDate();
// 0 = Monday ... 6 = Sunday
export const weekdayOf = (y: number, m: number, d: number) => (new Date(y, m, d).getDay() + 6) % 7;

export function parseIso(iso: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  return new Date(year, month, day).getMonth() === month ? { year, month, day } : null;
}

export function addMonths({ year, month }: Ym, delta: number): Ym {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

// The month as rows of seven: a day number, or null for the blanks before the 1st and after the last day.
export function monthGrid(ym: Ym): (number | null)[][] {
  const lead = weekdayOf(ym.year, ym.month, 1);
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth(ym) }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7));
}

export const monthTitle = ({ year, month }: Ym) => `${MONTHS[month]} ${year}`;
export const dayLabel = (y: number, m: number, d: number) => `${LONG_DAYS[weekdayOf(y, m, d)]} ${d} ${MONTHS[m]} ${y}`;
