import { describeBalance, describeTransfer, simplifyDebts } from "./balance";

test("4.5 says who owes or is owed, in plain words, for me and for others", () => {
  expect(describeBalance(50000, "Asha", true, 2, "INR")).toBe("You're owed ₹500.00");
  expect(describeBalance(-80000, "Asha", true, 2, "INR")).toBe("You owe ₹800.00");
  expect(describeBalance(0, "Asha", true, 2, "INR")).toBe("You're settled up");
  expect(describeBalance(245000, "Rahul", false, 2, "INR")).toBe("Rahul is owed ₹2,450.00");
  expect(describeBalance(-120000, "Anu", false, 2, "INR")).toBe("Anu owes ₹1,200.00");
  expect(describeBalance(0, "Anu", false, 2, "INR")).toBe("Anu is settled up");
});

test("4.5 respects the currency's decimals", () => {
  expect(describeBalance(-500, "Ken", false, 0, "JPY")).toBe("Ken owes ¥500");
});

const apply = (nets: { memberId: string; net: number }[], transfers: { from: string; to: string; amountMinor: number }[]) => {
  const b = new Map(nets.map((n) => [n.memberId, n.net]));
  for (const t of transfers) { b.set(t.from, b.get(t.from)! + t.amountMinor); b.set(t.to, b.get(t.to)! - t.amountMinor); }
  return [...b.values()];
};

test("5.4 the PRD example: Rahul +2450, Priya +850, Anu -1200, Karthik -2100 (in minor units)", () => {
  const nets = [{ memberId: "rahul", net: 245000 }, { memberId: "priya", net: 85000 }, { memberId: "anu", net: -120000 }, { memberId: "karthik", net: -210000 }];
  const t = simplifyDebts(nets);
  expect(t).toEqual([
    { from: "karthik", to: "rahul", amountMinor: 210000 },
    { from: "anu", to: "priya", amountMinor: 85000 },
    { from: "anu", to: "rahul", amountMinor: 35000 },
  ]);
  expect(apply(nets, t).every((n) => n === 0)).toBe(true);
});

test("5.4 already settled, or nobody, needs no transfers", () => {
  expect(simplifyDebts([])).toEqual([]);
  expect(simplifyDebts([{ memberId: "a", net: 0 }, { memberId: "b", net: 0 }])).toEqual([]);
});

test("5.4 ties are broken by member id, whatever the input order", () => {
  const a = simplifyDebts([{ memberId: "y", net: -500 }, { memberId: "b", net: 500 }, { memberId: "x", net: -500 }, { memberId: "a", net: 500 }]);
  const b = simplifyDebts([{ memberId: "a", net: 500 }, { memberId: "x", net: -500 }, { memberId: "b", net: 500 }, { memberId: "y", net: -500 }]);
  expect(a).toEqual(b);
  expect(a).toEqual([{ from: "x", to: "a", amountMinor: 500 }, { from: "y", to: "b", amountMinor: 500 }]);
});

test("5.4 for random zero-sum groups everyone ends at zero, using at most one fewer transfer than people with a balance", () => {
  let seed = 4242;
  const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  for (let round = 0; round < 1000; round++) {
    const people = 2 + rnd(9);
    const nets = Array.from({ length: people }, (_, i) => ({ memberId: `m${i}`, net: rnd(200001) - 100000 }));
    nets[people - 1].net -= nets.reduce((s, n) => s + n.net, 0); // force the group to sum to zero
    const t = simplifyDebts(nets);
    expect(nets.reduce((s, n) => s + n.net, 0)).toBe(0);
    expect(apply(nets, t).every((n) => n === 0)).toBe(true);
    const nonZero = nets.filter((n) => n.net !== 0).length;
    expect(t.length).toBeLessThanOrEqual(Math.max(0, nonZero - 1));
    expect(t.every((x) => x.amountMinor > 0 && x.from !== x.to)).toBe(true);
  }
});

test("5.4 transfers read in plain words from my point of view", () => {
  const name = (id: string) => ({ me: "Asha", r: "Rahul", b: "Ben" }[id] ?? id);
  expect(describeTransfer({ from: "me", to: "r", amountMinor: 80000 }, name, "me", 2, "INR")).toBe("You owe Rahul ₹800.00");
  expect(describeTransfer({ from: "b", to: "me", amountMinor: 50000 }, name, "me", 2, "INR")).toBe("Ben owes you ₹500.00");
  expect(describeTransfer({ from: "b", to: "r", amountMinor: 30000 }, name, "me", 2, "INR")).toBe("Ben owes Rahul ₹300.00");
});
