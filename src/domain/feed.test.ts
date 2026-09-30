import { clock12, dayHeading, describeEvent, describeParts, groupByDayHeading, isNew, whenLabel } from "./feed";

const ev = (entity_type: never, action: never, summary: Record<string, string | number>, actor: string | null = "Ben") => ({ entity_type, action, actor, summary });

test("6.5 joins, itinerary additions and new expenses each read as one plain line", () => {
  expect(describeEvent(ev("member" as never, "joined" as never, { name: "Ben" }))).toBe("Ben joined the trip");
  expect(describeEvent(ev("member" as never, "claimed" as never, { name: "Rahul" }))).toBe("Rahul claimed their spot");
  expect(describeEvent(ev("member" as never, "guest_added" as never, { name: "Rahul" }, "Asha"))).toBe("Asha added Rahul as a guest");
  expect(describeEvent(ev("itinerary_item" as never, "created" as never, { title: "Beach day", day: "2026-12-02" }))).toBe("Ben added Beach day to the plan for 2 Dec");
  expect(describeEvent(ev("expense" as never, "created" as never, { title: "Dinner", amount_minor: 90000, currency: "INR", exponent: 2, paid_by: "Ben" })))
    .toBe("Ben added Dinner · ₹900.00, paid by Ben");
});

test("6.5 an event with no known actor still reads sensibly", () => {
  expect(describeEvent(ev("itinerary_item" as never, "created" as never, { title: "Fort", day: "2026-12-03" }, null))).toMatch(/^Someone added/);
});

test("6.5 times read as Today, Yesterday, or the date", () => {
  const now = new Date(2026, 11, 5, 15, 0);
  expect(whenLabel(new Date(2026, 11, 5, 9, 5).toISOString(), now)).toBe("Today 09:05");
  expect(whenLabel(new Date(2026, 11, 4, 22, 30).toISOString(), now)).toBe("Yesterday 22:30");
  expect(whenLabel(new Date(2026, 11, 1, 8, 0).toISOString(), now)).toBe("01-12-2026 08:00");
  expect(whenLabel(new Date(2026, 10, 30, 8, 0).toISOString(), new Date(2026, 11, 1, 10, 0))).toBe("Yesterday 08:00");
});

test("6.5 only events newer than the last visit are new; a first visit marks nothing", () => {
  expect(isNew("2026-12-02T10:00:00Z", "2026-12-02T09:00:00Z")).toBe(true);
  expect(isNew("2026-12-02T09:00:00Z", "2026-12-02T09:00:00Z")).toBe(false);
  expect(isNew("2026-12-02T08:00:00Z", "2026-12-02T09:00:00Z")).toBe(false);
  expect(isNew("2026-12-02T10:00:00Z", null)).toBe(false);
});

test("the pieces of a line mark the names and titles bold, and join into the same sentence", () => {
  const parts = describeParts(ev("itinerary_item" as never, "created" as never, { title: "Temple", day: "2026-10-09" }, "Asha"));
  expect(parts.filter((p) => p.bold).map((p) => p.text)).toEqual(["Asha", "Temple", "9 Oct"]);
  expect(parts.map((p) => p.text).join("")).toBe("Asha added Temple to the plan for 9 Oct");
});

test("days are headed Today, Yesterday or the date, times are 12-hour, and events group by day in order", () => {
  const now = new Date(2026, 11, 5, 15, 0);
  const a = new Date(2026, 11, 5, 10, 9).toISOString(), b = new Date(2026, 11, 5, 9, 0).toISOString(), c = new Date(2026, 11, 4, 22, 30).toISOString(), d = new Date(2026, 10, 1, 8, 0).toISOString();
  expect(dayHeading(a, now)).toBe("Today");
  expect(dayHeading(c, now)).toBe("Yesterday");
  expect(dayHeading(d, now)).toBe("01-11-2026");
  expect(clock12(a)).toBe("10:09 AM");
  expect(clock12(new Date(2026, 11, 5, 0, 5).toISOString())).toBe("12:05 AM");
  expect(clock12(new Date(2026, 11, 5, 13, 30).toISOString())).toBe("01:30 PM");
  expect(groupByDayHeading([{ created_at: a }, { created_at: b }, { created_at: c }, { created_at: d }], now).map((g) => [g.heading, g.events.length]))
    .toEqual([["Today", 2], ["Yesterday", 1], ["01-11-2026", 1]]);
});
