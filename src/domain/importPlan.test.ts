import { toDrafts } from "./importPlan";
import { buildRequest, cleanItems, MAX_ITEMS, parseReply } from "../../supabase/functions/import-itinerary/logic";

const item = (o: object) => ({ title: "Beach", day: null, date: null, time: null, place: null, note: null, ...o });

test("US-03 a day number becomes that day of the trip; a full date is kept", () => {
  const d = toDrafts([item({ day: 2 }), item({ date: "2026-12-04" })], "2026-12-01", "2026-12-05");
  expect(d.map((x) => [x.day, x.flag])).toEqual([["2026-12-02", null], ["2026-12-04", null]]);
});

test("US-03 days outside the trip are kept and flagged; an item with no day goes on day 1 with a flag", () => {
  const d = toDrafts([item({ day: 9 }), item({ date: "2027-01-01" }), item({})], "2026-12-01", "2026-12-05");
  expect(d.map((x) => [x.day, x.flag])).toEqual([
    ["2026-12-09", "Outside your trip dates"], ["2027-01-01", "Outside your trip dates"], ["2026-12-01", "No day found, put on the first day"]]);
  expect(d.every((x) => x.on)).toBe(true);
});

test("US-03 a day number counts across a month end", () => {
  expect(toDrafts([item({ day: 3 })], "2026-12-30", "2027-01-03")[0].day).toBe("2027-01-01");
});

test("US-03 the model's answer is cleaned: bad times, days and dates are dropped, untitled items skipped, count capped", () => {
  const out = cleanItems({ items: [
    { title: "  Fort  ", day: 1, date: "2026-12-01", time: "06:30", place: "Fort, Puri", note: "Go early" },
    { title: "Lunch", day: 0, date: "tomorrow", time: "6am", place: "", note: 5 },
    { title: "", day: 1 }, null,
  ] });
  expect(out).toEqual([
    { title: "Fort", day: 1, date: "2026-12-01", time: "06:30", place: "Fort, Puri", note: "Go early" },
    { title: "Lunch", day: null, date: null, time: null, place: null, note: null },
  ]);
  expect(cleanItems({ items: Array.from({ length: 100 }, () => ({ title: "x" })) })).toHaveLength(MAX_ITEMS);
  expect(cleanItems("nope")).toEqual([]);
});

test("US-03 the reply is read even with code fences or chatter around the JSON; anything else is no plans", () => {
  expect(parseReply('Sure!\n```json\n{"items":[{"title":"Fort"}]}\n```')).toEqual({ items: [{ title: "Fort" }] });
  expect(cleanItems(parseReply("I could not find an itinerary"))).toEqual([]);
  expect(cleanItems(parseReply('{"items": [oops'))).toEqual([]);
});

test("US-03 the request tries the models in order and sends the text as data", () => {
  const r = buildRequest("D1: Fort", { name: "Puri", start: "2026-12-01", end: "2026-12-03" }, ["a:free", "b:free"]);
  expect(r.models).toEqual(["a:free", "b:free"]);
  expect(r.messages[1]).toEqual({ role: "user", content: "D1: Fort" });
  expect(r.messages[0].content).toMatch(/2026-12-01 to 2026-12-03/);
});
