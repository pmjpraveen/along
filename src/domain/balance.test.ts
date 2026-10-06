import { describeBalance, describeTransfer, pairwiseDebts, simplifyDebts } from "./balance";

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

// The Puri trip: three flights, each paid by one person and shared equally by the people on that flight.
const puri = [
  { payerId: "praveen", shares: ["praveen", "asha", "lata", "meera", "mohan"].map((m) => ({ memberId: m, owedMinor: 1422600 })) },
  { payerId: "hemant", shares: ["hemant", "anusha", "deepa", "girija"].map((m) => ({ memberId: m, owedMinor: 1682000 })) },
  { payerId: "shiva", shares: [{ memberId: "shiva", owedMinor: 1838567 }, { memberId: "manjula", owedMinor: 1838567 }, { memberId: "madhu", owedMinor: 1838566 }] },
];

test("US-14 the settle-up list says exactly what the expenses say: each person owes the person who paid", () => {
  const t = pairwiseDebts(puri, []);
  expect(t).toEqual([
    { from: "manjula", to: "shiva", amountMinor: 1838567 },
    { from: "madhu", to: "shiva", amountMinor: 1838566 },
    { from: "anusha", to: "hemant", amountMinor: 1682000 },
    { from: "deepa", to: "hemant", amountMinor: 1682000 },
    { from: "girija", to: "hemant", amountMinor: 1682000 },
    { from: "asha", to: "praveen", amountMinor: 1422600 },
    { from: "lata", to: "praveen", amountMinor: 1422600 },
    { from: "meera", to: "praveen", amountMinor: 1422600 },
    { from: "mohan", to: "praveen", amountMinor: 1422600 },
  ]);
});

test("US-14 the order is the same whichever order the expenses arrive in", () => {
  expect(pairwiseDebts([...puri].reverse(), [])).toEqual(pairwiseDebts(puri, []));
});

test("US-14 two people who each paid for the other are netted into one line", () => {
  const t = pairwiseDebts([
    { payerId: "a", shares: [{ memberId: "a", owedMinor: 500 }, { memberId: "b", owedMinor: 1000 }] },
    { payerId: "b", shares: [{ memberId: "a", owedMinor: 400 }, { memberId: "b", owedMinor: 100 }] },
  ], []);
  expect(t).toEqual([{ from: "b", to: "a", amountMinor: 600 }]);
});

test("US-14 a payment reduces what is owed, a full payment removes the line, and its reversal puts it back", () => {
  const e = [{ payerId: "a", shares: [{ memberId: "a", owedMinor: 500 }, { memberId: "b", owedMinor: 500 }] }];
  expect(pairwiseDebts(e, [{ fromId: "b", toId: "a", amountMinor: 200 }])).toEqual([{ from: "b", to: "a", amountMinor: 300 }]);
  expect(pairwiseDebts(e, [{ fromId: "b", toId: "a", amountMinor: 500 }])).toEqual([]);
  expect(pairwiseDebts(e, [{ fromId: "b", toId: "a", amountMinor: 500 }, { fromId: "b", toId: "a", amountMinor: 500, reversal: true }])).toEqual([{ from: "b", to: "a", amountMinor: 500 }]);
  // an overpayment turns the line around
  expect(pairwiseDebts(e, [{ fromId: "b", toId: "a", amountMinor: 700 }])).toEqual([{ from: "a", to: "b", amountMinor: 200 }]);
});

test("US-14 a payer's own share, and a payer-only expense, create no debt to themselves", () => {
  expect(pairwiseDebts([{ payerId: "a", shares: [{ memberId: "a", owedMinor: 900 }] }], [])).toEqual([]);
});

test("US-14 for random expenses and payments, every person's total matches the ledger's net, and no pair appears twice", () => {
  let seed = 99;
  const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  const people = ["a", "b", "c", "d", "e", "f"];
  for (let round = 0; round < 500; round++) {
    const expenses = Array.from({ length: 1 + rnd(5) }, () => ({
      payerId: people[rnd(6)], shares: people.filter(() => rnd(2) === 0).map((m) => ({ memberId: m, owedMinor: 1 + rnd(50000) })),
    }));
    const payments = Array.from({ length: rnd(4) }, () => { const from = people[rnd(6)]; const to = people[(people.indexOf(from) + 1 + rnd(5)) % 6]; return { fromId: from, toId: to, amountMinor: 1 + rnd(30000), reversal: rnd(4) === 0 }; });
    const net = new Map(people.map((m) => [m, 0]));   // the ledger: payer credited, each share debited; payment: payer + , receiver -; reversal flips
    for (const e of expenses) { net.set(e.payerId, net.get(e.payerId)! + e.shares.reduce((s, x) => s + x.owedMinor, 0)); for (const s of e.shares) net.set(s.memberId, net.get(s.memberId)! - s.owedMinor); }
    for (const p of payments) { const k = p.reversal ? -1 : 1; net.set(p.fromId, net.get(p.fromId)! + k * p.amountMinor); net.set(p.toId, net.get(p.toId)! - k * p.amountMinor); }
    const t = pairwiseDebts(expenses, payments);
    const fromList = new Map(people.map((m) => [m, 0]));
    for (const x of t) { fromList.set(x.from, fromList.get(x.from)! - x.amountMinor); fromList.set(x.to, fromList.get(x.to)! + x.amountMinor); }
    // payer's own share is netted away in the ledger too, so compare the two directly
    for (const m of people) expect(fromList.get(m)).toBe(net.get(m));
    const pairs = t.map((x) => [x.from, x.to].sort().join("|"));
    expect(new Set(pairs).size).toBe(pairs.length);
    expect(t.every((x) => x.amountMinor > 0 && x.from !== x.to)).toBe(true);
  }
});
