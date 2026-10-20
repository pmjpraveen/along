import { clampTilt, MAX_PEOPLE, recapCard, recapSummary, RecapInput } from "./recap";

const people = (n: number) => Array.from({ length: n }, (_, k) => ({ id: `m${String(k).padStart(2, "0")}`, name: `P${k}`, guest: k % 3 === 0, shareMinor: 1000 * (k % 4) }));
const base: RecapInput = { tripId: "t1", name: "Goa", destination: "Goa, India", start: "2026-03-01", end: "2026-03-05", completed: true, currency: { code: "INR", exponent: 2 }, totalMinor: 500000, people: people(3), showAmounts: true };

describe("RC-01 recapCard", () => {
  it("lists people biggest share first, ties by id", () => {
    const mk = (id: string, shareMinor: number) => ({ id, name: id, guest: false, shareMinor });
    const c = recapCard({ ...base, people: [mk("b", 100), mk("a", 100), mk("z", 900), mk("c", 0)] });
    expect(c.people.map((p) => p.id)).toEqual(["z", "a", "b", "c"]);
  });
  it("caps at six: five and the rest as others", () => {
    for (let n = 1; n <= 12; n++) {
      const c = recapCard({ ...base, people: people(n) });
      expect(c.people.length + c.overflow).toBe(n);
      expect(c.people.length).toBeLessThanOrEqual(MAX_PEOPLE);
      expect(c.overflow).toBe(n > MAX_PEOPLE ? n - (MAX_PEOPLE - 1) : 0);
    }
  });
  it("RC-03 hides names and amounts but keeps the headcount", () => {
    const c = recapCard({ ...base, showAmounts: false, people: people(8) });
    expect(c.people).toEqual([]);
    expect(c.overflow).toBe(0);
    expect(c.headcount).toBe(8);
    expect(recapSummary(c, base.currency)).toContain("8 people");
  });
  it("an active trip is 'so far' with no stamps", () => {
    const c = recapCard({ ...base, completed: false });
    expect(c.soFar).toBe(true);
    expect(recapSummary(c, base.currency)).toContain("Spent so far ₹5,000.00");
  });
  it("the spoken summary names each person's share", () => {
    expect(recapSummary(recapCard({ ...base, people: [{ id: "a", name: "Asha", guest: false, shareMinor: 160000 }] }), base.currency)).toContain("Asha ₹1,600.00");
  });
});

describe("RC-08 clampTilt", () => {
  it("is zero at the starting angle, relative to it, and held to ±12°", () => {
    expect(clampTilt(1, 1)).toBe(0);
    expect(clampTilt(1 + (5 * Math.PI) / 180, 1)).toBeCloseTo(5);
    expect(clampTilt(3, 1)).toBe(12);
    expect(clampTilt(-3, 1)).toBe(-12);
  });
});

import { tripDays, tripFacts } from "./recap";
describe("RC-09 tripFacts", () => {
  const e = (date: string, category: string) => ({ date, category });
  const base = { start: "2026-03-01", end: "2026-03-05", people: 3, activities: 4, photos: 2, memories: 5, places: ["Cafe Dune", "Old Fort"] };
  const list = [e("2026-03-03", "food"), e("2026-03-03", "food"), e("2026-03-01", "transport"), e("2026-03-02", "stay")];
  it("names the trip after what the group logged most and picks out the facts", () => {
    const f = tripFacts({ ...base, expenses: list });
    expect(f.tagline).toBe("The foodie trip");
    expect(f.facts).toEqual([
      { label: "Favourite thing", value: "Food", note: "2 times together" },
      { label: "Busiest day", value: "Day 3", note: "2 things shared" },
      { label: "Memories saved", value: "5", note: "2 photos" },
    ]);
    expect([f.days, f.people, f.activities]).toEqual([5, 3, 4]);
  });
  it("US-RC carries no money and no names", () => {
    const f = tripFacts({ ...base, expenses: list });
    expect(JSON.stringify(f)).not.toMatch(/₹|\$|€|%|Asha|Ravi/);
  });
  it("breaks ties the same way every time and copes with no expenses or memories", () => {
    expect(tripFacts({ ...base, expenses: [e("2026-03-01", "stay"), e("2026-03-02", "food")] }).facts[0].value).toBe("Food");
    const none = tripFacts({ ...base, expenses: [], memories: 0, photos: 0, places: [] });
    expect(none.facts).toEqual([]);
    expect(none.tagline).toBe("A trip to remember");
  });
  it("counts trip days inclusively", () => { expect(tripDays("2026-03-01", "2026-03-01")).toBe(1); expect(tripDays("2026-03-01", "2026-03-07")).toBe(7); });
});

import { POSTAGE_COLORS, postageSpec } from "./recap";
describe("RC-10 postageSpec", () => {
  const base = { tripId: "t1", destination: "Kullu, India", start: "2026-10-01", end: "2026-10-07" };
  it("prints the country, the length of the trip and a postmark date, with no money on it", () => {
    expect(postageSpec(base)).toMatchObject({ country: "INDIA", city: "KULLU", value: "7 DAYS", year: "2026", postmark: "07 OCT 26" });
    expect(postageSpec({ ...base, end: "2026-10-01" }).value).toBe("1 DAY");
    expect(postageSpec({ ...base, destination: "Goa" }).country).toBe("GOA");
    expect(postageSpec({ ...base, destination: "Ubud, Bali, Indonesia" }).country).toBe("INDONESIA");
  });
  it("colour is stable per trip and varies between trips", () => {
    expect(postageSpec(base).color).toBe(postageSpec(base).color);
    expect(new Set(Array.from({ length: 100 }, (_, k) => postageSpec({ ...base, tripId: `t${k}` }).color)).size).toBe(POSTAGE_COLORS.length);
  });
});
