// Turns what the import function found into drafts for the review screen: every plan gets a real date, and anything that does not fit the trip is flagged, not dropped.
export type ImportedItem = { title: string; day: number | null; date: string | null; time: string | null; place: string | null; note: string | null };
export type PlanDraft = { key: string; title: string; day: string; time: string | null; place: string; note: string; flag: string | null; on: boolean };

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export function toDrafts(items: ImportedItem[], start: string, end: string): PlanDraft[] {
  return items.map((i, n) => {
    const day = i.date ?? (i.day ? addDays(start, i.day - 1) : start);
    const flag = !i.date && !i.day ? "No day found, put on the first day" : day < start || day > end ? "Outside your trip dates" : null;
    return { key: `${n}`, title: i.title, day, time: i.time, place: i.place ?? "", note: i.note ?? "", flag, on: true };
  });
}
