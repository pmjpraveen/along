import { formatMinor } from "./money";

// Positive net = the group owes them; negative = they owe the group. Plain words, never debit/credit.
export function describeBalance(net: number, name: string, isMe: boolean, exponent: number, code: string): string {
  const amount = formatMinor(Math.abs(net), exponent, code);
  if (net === 0) return isMe ? "You're settled up" : `${name} is settled up`;
  if (net > 0) return isMe ? `You're owed ${amount}` : `${name} is owed ${amount}`;
  return isMe ? `You owe ${amount}` : `${name} owes ${amount}`;
}

export type Net = { memberId: string; net: number };
export type Transfer = { from: string; to: string; amountMinor: number };

// Who should pay whom, so everyone reaches zero in as few payments as possible: match the largest creditor with the
// largest debtor until nothing is left, ties by member id. At most (people with a balance - 1) transfers.
// Input nets must sum to zero (they do: they come from the ledger). Computed on read, never stored.
export function simplifyDebts(nets: Net[]): Transfer[] {
  const byBiggest = (a: Net, b: Net) => (b.net !== a.net ? b.net - a.net : a.memberId < b.memberId ? -1 : 1);
  const creditors = nets.filter((n) => n.net > 0).sort(byBiggest).map((n) => ({ ...n }));
  const debtors = nets.filter((n) => n.net < 0).map((n) => ({ memberId: n.memberId, net: -n.net })).sort(byBiggest);
  const out: Transfer[] = [];
  while (creditors.length && debtors.length) {
    const c = creditors[0];
    const d = debtors[0];
    const amountMinor = Math.min(c.net, d.net);
    out.push({ from: d.memberId, to: c.memberId, amountMinor });
    c.net -= amountMinor;
    d.net -= amountMinor;
    if (c.net === 0) creditors.shift();
    if (d.net === 0) debtors.shift();
    creditors.sort(byBiggest);
    debtors.sort(byBiggest);
  }
  return out;
}

// What was actually added, netted per pair of people: each person on an expense owes the payer their share; a payment between two people reduces
// what the payer owes the receiver, and its reversal puts it back. For each pair only the difference is left, so "A owes B" and "B owes A" never
// both appear. Nobody is moved to a different person, so every line traces to the expenses and payments behind it. The result gives each person
// the same total as the ledger. Biggest amounts first, ties by member id, so the list never reshuffles between loads.
export type ExpenseEntry = { payerId: string; shares: { memberId: string; owedMinor: number }[] };
export type PaymentEntry = { fromId: string; toId: string; amountMinor: number; reversal?: boolean };
export function pairwiseDebts(expenses: ExpenseEntry[], payments: PaymentEntry[]): Transfer[] {
  const owes = new Map<string, number>();   // "a|b" with a < b: what a owes b (negative: b owes a)
  const add = (debtor: string, creditor: string, amount: number) => {
    if (debtor === creditor || amount === 0) return;
    const [a, b, sign] = debtor < creditor ? [debtor, creditor, 1] : [creditor, debtor, -1];
    owes.set(`${a}|${b}`, (owes.get(`${a}|${b}`) ?? 0) + sign * amount);
  };
  for (const e of expenses) for (const s of e.shares) add(s.memberId, e.payerId, s.owedMinor);
  for (const p of payments) add(p.fromId, p.toId, -(p.reversal ? -p.amountMinor : p.amountMinor));   // a payment cancels debt; a reversal restores it
  const out: Transfer[] = [];
  for (const [key, net] of owes) {
    if (net === 0) continue;
    const [a, b] = key.split("|");
    out.push(net > 0 ? { from: a, to: b, amountMinor: net } : { from: b, to: a, amountMinor: -net });
  }
  return out.sort((x, y) => y.amountMinor - x.amountMinor || (x.from < y.from ? -1 : x.from > y.from ? 1 : x.to < y.to ? -1 : x.to > y.to ? 1 : 0));
}

// "You owe Rahul ₹800.00", "Ben owes you ₹500.00", "Ben owes Rahul ₹300.00".
export function describeTransfer(t: Transfer, nameOf: (id: string) => string, meId: string | null, exponent: number, code: string): string {
  const amount = formatMinor(t.amountMinor, exponent, code);
  if (t.from === meId) return `You owe ${nameOf(t.to)} ${amount}`;
  if (t.to === meId) return `${nameOf(t.from)} owes you ${amount}`;
  return `${nameOf(t.from)} owes ${nameOf(t.to)} ${amount}`;
}
