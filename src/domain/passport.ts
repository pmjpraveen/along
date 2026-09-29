export type StampRow = { id: string; trip_id: string; destination_name: string; start_date: string; end_date: string; awarded_at: string };

// Most recent trip first (by the trip's own dates, then when the stamp was awarded). The order never depends on how rows arrive.
export const sortStamps = (stamps: StampRow[]): StampRow[] =>
  [...stamps].sort((a, b) => (a.start_date !== b.start_date ? (a.start_date < b.start_date ? 1 : -1) : a.awarded_at < b.awarded_at ? 1 : a.awarded_at > b.awarded_at ? -1 : 0));
