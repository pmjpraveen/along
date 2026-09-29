export const ITEM_TYPES = ["activity", "place", "restaurant", "transport", "stay", "free_time", "other"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];
export const TYPE_LABEL: Record<ItemType, string> = {
  activity: "Activity", place: "Place", restaurant: "Food", transport: "Transport", stay: "Stay", free_time: "Free time", other: "Other",
};

export type Item = {
  id: string; version: number; title: string; type: ItemType; day_date: string;
  start_time: string | null; end_time: string | null; sort_order: number; is_outside_trip_range: boolean; participants: string[];
  location_text: string | null; location_url: string | null; latitude: number | null; longitude: number | null; formatted_address: string | null;
};
export type Day = { date: string; items: Item[] };

// Days ascending; within a day, timed items by start time, then untimed items in their manual order.
export function groupByDay(items: Item[]): Day[] {
  const byDate = new Map<string, Item[]>();
  for (const i of items) byDate.set(i.day_date, [...(byDate.get(i.day_date) ?? []), i]);
  return [...byDate.keys()].sort().map((date) => ({
    date,
    items: byDate.get(date)!.sort((a, b) =>
      a.start_time && b.start_time ? a.start_time.localeCompare(b.start_time)
      : a.start_time ? -1 : b.start_time ? 1 : a.sort_order - b.sort_order),
  }));
}

export type ItemDraft = { title: string; day: string };
export const validateItem = (d: ItemDraft): Partial<Record<keyof ItemDraft, string>> => ({
  ...(d.title.trim() ? {} : { title: "Give this a title." }),
  ...(d.day ? {} : { day: "Pick a date." }),
});
