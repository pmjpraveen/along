import { sharesError, splitShares, formatPercent, percentError, splitPercentage, customError, customRemaining, customShares, shareSummary, splitEqual } from "./split";

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

test("4.4 the summary says each share, or the two possible shares when it does not divide evenly", () => {
  expect(shareSummary(splitEqual(1000, ["a", "b"]), 2, "INR")).toBe("₹5.00 each");
  expect(shareSummary(splitEqual(1000, ["a", "b", "c"]), 2, "INR")).toBe("₹3.34 or ₹3.33 each");
  expect(shareSummary(splitEqual(500, ["a"]), 0, "JPY")).toBe("¥500 each");
});

test("5.1 remaining is total minus entered: positive still to assign, negative over, zero done", () => {
  expect(customRemaining(10000, [7000, 2000])).toBe(1000);
  expect(customRemaining(10000, [7000, 3500])).toBe(-500);
  expect(customRemaining(10000, [7000, 3000])).toBe(0);
  expect(customRemaining(10000, [])).toBe(10000);
});

test("5.1 people with no amount are left out, the rest sorted by member id", () => {
  expect(customShares({ b: 300, a: 700, c: 0 })).toEqual([{ memberId: "a", owedMinor: 700 }, { memberId: "b", owedMinor: 300 }]);
});

test("5.1 a custom split is valid only when the amounts equal the total, for every combination in a range", () => {
  for (let total = 1; total <= 60; total++) {
    for (let a = 0; a <= total + 3; a++) {
      const shares = customShares({ x: a, y: total - a });
      const err = customError(total, shares, 2, "INR");
      const sum = shares.reduce((s, x) => s + x.owedMinor, 0);
      expect(err === null).toBe(sum === total && shares.length > 0);
    }
  }
});

test("5.1 the error names the amount left or the overage", () => {
  expect(customError(10000, customShares({ a: 7000, b: 2000 }), 2, "INR")).toBe("₹10.00 still to assign. Amounts must add up to the total.");
  expect(customError(10000, customShares({ a: 7000, b: 3500 }), 2, "INR")).toBe("Over by ₹5.00. Amounts must add up to the total.");
  expect(customError(10000, [], 2, "INR")).toBe("Enter an amount for at least one person.");
  expect(customError(10000, customShares({ a: 7000, b: 3000 }), 2, "INR")).toBeNull();
});

test("5.2 every percentage split sums to the total, for all amounts and many percentage sets", () => {
  const sets = [[3333, 3333, 3334], [5000, 5000], [1, 9999], [2500, 2500, 2500, 2500], [3333, 3333, 3333, 1], [1000, 2000, 3000, 4000], [10000], [1, 1, 9998]];
  for (let amount = 1; amount <= 400; amount++) {
    for (const set of sets) {
      const shares = splitPercentage(amount, Object.fromEntries(set.map((bp, i) => [`m${i}`, bp])));
      expect(shares.reduce((s, x) => s + x.owedMinor, 0)).toBe(amount);
      expect(shares).toHaveLength(set.length);
    }
  }
});

test("5.2 pseudo-random percentage sets over a wide range of amounts never drift", () => {
  let seed = 12345;
  const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  for (let round = 0; round < 500; round++) {
    const people = 1 + rnd(8);
    const cuts = Array.from({ length: people - 1 }, () => 1 + rnd(9998)).sort((a, b) => a - b);
    const bps = [...cuts, 10000].map((c, i, a) => c - (i ? a[i - 1] : 0)).filter((b) => b > 0);
    const amount = 1 + rnd(50_000_000);
    const shares = splitPercentage(amount, Object.fromEntries(bps.map((bp, i) => [`m${i}`, bp])));
    expect(shares.reduce((s, x) => s + x.owedMinor, 0)).toBe(amount);
    for (const [i, sh] of shares.entries()) expect(Math.abs(sh.owedMinor - (amount * bps[i]) / 10000)).toBeLessThan(1);
  }
});

test("5.2 a huge amount stays exact (no float overflow)", () => {
  const amount = 9_007_199_254_740_991;
  const shares = splitPercentage(amount, { a: 3333, b: 3333, c: 3334 });
  expect(shares.reduce((s, x) => s + BigInt(x.owedMinor), 0n)).toBe(BigInt(amount));
});

test("5.2 leftover minor units go to the biggest remainders, ties by member id", () => {
  // 100 * 33.33% = 33.33 each; leftover 1 goes to the largest remainder, which is "b" (3334 -> 33.34)
  expect(splitPercentage(100, { a: 3333, b: 3334, c: 3333 }).map((s) => s.owedMinor)).toEqual([33, 34, 33]);
  // 1 minor unit over three equal-ish shares: tie on remainder goes to the lowest id
  expect(splitPercentage(1, { c: 3333, a: 3333, b: 3334 })).toEqual([{ memberId: "a", owedMinor: 0 }, { memberId: "b", owedMinor: 1 }, { memberId: "c", owedMinor: 0 }]);
  expect(splitPercentage(1, { a: 5000, b: 5000 })).toEqual([{ memberId: "a", owedMinor: 1 }, { memberId: "b", owedMinor: 0 }]);
});

test("5.2 percentages that do not total 100%, zero people, and bad amounts are rejected", () => {
  expect(() => splitPercentage(100, { a: 5000, b: 4999 })).toThrow();
  expect(() => splitPercentage(100, { a: 5000, b: 5001 })).toThrow();
  expect(() => splitPercentage(100, {})).toThrow();
  expect(() => splitPercentage(0, { a: 10000 })).toThrow();
  expect(() => splitPercentage(100, { a: 10000.5 })).toThrow();
});

test("5.2 people with 0% are left out of the split", () => {
  expect(splitPercentage(100, { a: 10000, b: 0 })).toEqual([{ memberId: "a", owedMinor: 100 }]);
});

test("5.2 percent errors name what is left or the overage", () => {
  expect(percentError({ a: 6000, b: 3000 })).toBe("10.00% still to assign. Percentages must total 100%.");
  expect(percentError({ a: 6000, b: 4500 })).toBe("Over by 5.00%. Percentages must total 100%.");
  expect(percentError({})).toBe("Enter a percentage for at least one person.");
  expect(percentError({ a: 6000, b: 4000 })).toBeNull();
  expect(formatPercent(3333)).toBe("33.33");
  expect(formatPercent(5)).toBe("0.05");
});

test("5.3 every share-based split sums to the total, for all amounts and many share sets", () => {
  const sets = [[1, 1, 1], [2, 1], [3, 3, 2], [1, 2, 3, 4], [7, 1], [5], [1, 1, 1, 1, 1, 1, 1], [10, 3, 3, 1], [100, 1]];
  for (let amount = 1; amount <= 400; amount++) {
    for (const set of sets) {
      const shares = splitShares(amount, Object.fromEntries(set.map((n, i) => [`m${i}`, n])));
      expect(shares.reduce((s, x) => s + x.owedMinor, 0)).toBe(amount);
      expect(shares).toHaveLength(set.length);
    }
  }
});

test("5.3 pseudo-random share sets over a wide range of amounts never drift and stay proportional", () => {
  let seed = 987;
  const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  for (let round = 0; round < 500; round++) {
    const counts = Array.from({ length: 1 + rnd(8) }, () => 1 + rnd(20));
    const amount = 1 + rnd(50_000_000);
    const shares = splitShares(amount, Object.fromEntries(counts.map((n, i) => [`m${i}`, n])));
    const sum = counts.reduce((a, b) => a + b, 0);
    expect(shares.reduce((s, x) => s + x.owedMinor, 0)).toBe(amount);
    for (const [i, sh] of shares.entries()) expect(Math.abs(sh.owedMinor - (amount * counts[i]) / sum)).toBeLessThan(1);
  }
});

test("5.3 proportional amounts: 3 nights vs 1 night of 1000", () => {
  expect(splitShares(1000, { a: 3, b: 1 })).toEqual([{ memberId: "a", owedMinor: 750 }, { memberId: "b", owedMinor: 250 }]);
});

test("5.3 rounding is deterministic: biggest remainder first, ties by member id, input order irrelevant", () => {
  // 100 over 1:1:1 -> 33.33 each; the one leftover unit goes to the lowest id
  expect(splitShares(100, { c: 1, a: 1, b: 1 })).toEqual([{ memberId: "a", owedMinor: 34 }, { memberId: "b", owedMinor: 33 }, { memberId: "c", owedMinor: 33 }]);
  // 10 over 3:2 -> 6 and 4 exactly
  expect(splitShares(10, { a: 3, b: 2 }).map((s) => s.owedMinor)).toEqual([6, 4]);
  // 1 over 2:1 -> a has the bigger remainder (0.667) and gets the unit
  expect(splitShares(1, { a: 2, b: 1 })).toEqual([{ memberId: "a", owedMinor: 1 }, { memberId: "b", owedMinor: 0 }]);
  expect(splitShares(1, { b: 1, a: 2 })).toEqual(splitShares(1, { a: 2, b: 1 }));
});

test("5.3 a huge amount stays exact", () => {
  const amount = 9_007_199_254_740_991;
  expect(splitShares(amount, { a: 7, b: 3, c: 5 }).reduce((s, x) => s + BigInt(x.owedMinor), 0n)).toBe(BigInt(amount));
});

test("5.3 zero shares leave a person out; no shares, fractional shares and bad amounts are rejected", () => {
  expect(splitShares(100, { a: 1, b: 0 })).toEqual([{ memberId: "a", owedMinor: 100 }]);
  expect(() => splitShares(100, {})).toThrow();
  expect(() => splitShares(100, { a: 0 })).toThrow();
  expect(() => splitShares(100, { a: 1.5 })).toThrow();
  expect(() => splitShares(100, { a: -1, b: 2 }).length).not.toThrow(); // negatives are ignored like zero
  expect(() => splitShares(0, { a: 1 })).toThrow();
  expect(sharesError({ a: 0 })).toBe("Enter shares for at least one person.");
  expect(sharesError({ a: 2 })).toBeNull();
});
