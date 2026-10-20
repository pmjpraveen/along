import { STAMP_SIZE, stampPlacement, clampTilt, MAX_PEOPLE, rankFor, recapCard, recapSummary, RecapInput, suitFor, SUITS } from "./recap";

const people = (n: number) => Array.from({ length: n }, (_, k) => ({ id: `m${String(k).padStart(2, "0")}`, name: `P${k}`, guest: k % 3 === 0, shareMinor: 1000 * (k % 4) }));
const base: RecapInput = { tripId: "t1", name: "Goa", destination: "Goa, India", start: "2026-03-01", end: "2026-03-05", completed: true, currency: { code: "INR", exponent: 2 }, totalMinor: 500000, people: people(3), showAmounts: true };

describe("RC-08 rank and suit", () => {
  it("rank is the trip length in days, a star past 30", () => {
    expect(rankFor("2026-03-01", "2026-03-01")).toBe("1");
    expect(rankFor("2026-03-01", "2026-03-05")).toBe("5");
    expect(rankFor("2026-03-01", "2026-03-30")).toBe("30");
    expect(rankFor("2026-03-01", "2026-03-31")).toBe("★");
    expect(rankFor("2026-02-27", "2026-03-02")).toBe("4");
  });
  it("suit is stable per trip and spread across the four", () => {
    expect(suitFor("abc")).toBe(suitFor("abc"));
    const seen = new Set(Array.from({ length: 200 }, (_, k) => suitFor(`trip-${k}`)));
    expect(seen.size).toBe(SUITS.length);
  });
});

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
    expect(c.stamps).toBe(false);
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

describe("RC-08 stampPlacement", () => {
  it("is stable per trip and puts arrival at the top right and departure at the bottom left, partly off the card", () => {
    expect(stampPlacement("t1")).toEqual(stampPlacement("t1"));
    expect(new Set(Array.from({ length: 50 }, (_, k) => stampPlacement(`t${k}`)[0].tilt)).size).toBeGreaterThan(30);
    const [a, d] = stampPlacement("t1");
    expect(a.x + STAMP_SIZE).toBeGreaterThan(360);
    expect(d.x).toBeLessThan(0);
    expect(a.y).toBeLessThan(d.y);
  });
});

import { RECAP_INKS, recapInks } from "./recap";
describe("RC-08 recapInks", () => {
  it("uses only black, blue and red, never the same for both stamps, and is stable per trip", () => {
    const seen = new Set<string>();
    for (let k = 0; k < 300; k++) {
      const i = recapInks(`trip-${k}`);
      expect(RECAP_INKS).toContain(i.arrival);
      expect(RECAP_INKS).toContain(i.departure);
      expect(i.arrival).not.toBe(i.departure);
      expect(recapInks(`trip-${k}`)).toEqual(i);
      seen.add(i.arrival);
    }
    expect(seen.size).toBe(3);
  });
});
