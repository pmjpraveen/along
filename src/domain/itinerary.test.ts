import { groupByDay, Item, validateItem } from "./itinerary";

const item = (o: Partial<Item>): Item => ({
  id: "i", version: 1, title: "x", type: "activity", day_date: "2026-12-02", start_time: null, end_time: null, sort_order: 0, is_outside_trip_range: false, participants: [], location_text: null, location_url: null, latitude: null, longitude: null, formatted_address: null, ...o,
});

test("US-03 items appear under the correct date, days ascending", () => {
  const days = groupByDay([item({ id: "b", day_date: "2026-12-03" }), item({ id: "a", day_date: "2026-12-02" })]);
  expect(days.map((d) => d.date)).toEqual(["2026-12-02", "2026-12-03"]);
  expect(days[1].items.map((i) => i.id)).toEqual(["b"]);
});

test("US-03 timed items come first by time, then untimed in manual order", () => {
  const [day] = groupByDay([
    item({ id: "u2", sort_order: 1 }), item({ id: "late", start_time: "19:30:00" }),
    item({ id: "u1", sort_order: 0 }), item({ id: "early", start_time: "09:00:00" }),
  ]);
  expect(day.items.map((i) => i.id)).toEqual(["early", "late", "u1", "u2"]);
});

test("US-03 an item outside the trip dates still groups on its own date", () => {
  expect(groupByDay([item({ day_date: "2026-11-30", is_outside_trip_range: true })])[0].date).toBe("2026-11-30");
});

test("US-03 title and date are required", () => {
  expect(validateItem({ title: " ", day: "" })).toEqual({ title: "Give this a title.", day: "Pick a date." });
  expect(validateItem({ title: "Beach", day: "2026-12-02" })).toEqual({});
});
