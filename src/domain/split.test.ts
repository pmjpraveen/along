import { shareSummary, splitEqual } from "./split";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `m${String(i).padStart(2, "0")}`);

test("US-05 every equal split sums to the total, for all amounts and group sizes", () => {
  for (let amount = 1; amount <= 600; amount++) {
    for (let n = 1; n <= 13; n++) {
      const shares = splitEqual(amount, ids(n));
      expect(shares.reduce((s, x) => s + x.owedMinor, 0)).toBe(amount);
      const owed = shares.map((x) => x.owedMinor);
      expect(Math.max(...owed) - Math.min(...owed)).toBeLessThanOrEqual(1);
    }
  }
});

test("US-05 large amounts still sum exactly", () => {
  for (const amount of [999_999_999, 123_456_789_012, 1_000_000_000_001]) {
    for (const n of [3, 7, 11]) {
      expect(splitEqual(amount, ids(n)).reduce((s, x) => s + x.owedMinor, 0)).toBe(amount);
    }
  }
});

test("US-05 leftover minor units go to the lowest member ids, whatever the pick order", () => {
  const shares = splitEqual(100, ["c", "a", "b"]);
  expect(shares).toEqual([{ memberId: "a", owedMinor: 34 }, { memberId: "b", owedMinor: 33 }, { memberId: "c", owedMinor: 33 }]);
  expect(splitEqual(100, ["b", "c", "a"])).toEqual(shares);
});

test("US-05 a single payer-only participant owes the whole amount", () => {
  expect(splitEqual(1234, ["a"])).toEqual([{ memberId: "a", owedMinor: 1234 }]);
});

test("US-05 zero participants, duplicates and bad amounts are rejected", () => {
  expect(() => splitEqual(100, [])).toThrow();
  expect(() => splitEqual(100, ["a", "a"])).toThrow();
  for (const bad of [0, -5, 10.5, NaN]) expect(() => splitEqual(bad, ["a"])).toThrow();
});

test("US-08 the summary says each share, or the two possible shares when it does not divide evenly", () => {
  expect(shareSummary(splitEqual(1000, ["a", "b"]), 2, "INR")).toBe("₹5.00 each");
  expect(shareSummary(splitEqual(1000, ["a", "b", "c"]), 2, "INR")).toBe("₹3.34 or ₹3.33 each");
  expect(shareSummary(splitEqual(500, ["a"]), 0, "JPY")).toBe("¥500 each");
});
