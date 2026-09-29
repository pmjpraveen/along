import { formatMinor } from "./money";

export type Share = { memberId: string; owedMinor: number };

// Equal split by largest remainder: everyone gets the floor, and the leftover minor units go one each to the
// first members by id, so the result never depends on the order the members were picked in.
export function splitEqual(amountMinor: number, memberIds: string[]): Share[] {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) throw new Error("amount must be a positive integer");
  if (memberIds.length === 0) throw new Error("at least one participant is required");
  if (new Set(memberIds).size !== memberIds.length) throw new Error("participants must be unique");
  const ids = [...memberIds].sort();
  const base = Math.floor(amountMinor / ids.length);
  const extra = amountMinor - base * ids.length;
  return ids.map((memberId, i) => ({ memberId, owedMinor: base + (i < extra ? 1 : 0) }));
}

// One plain line for a live split: "₹500.00 each", or "₹333.34 or ₹333.33 each" when the amount does not divide evenly.
export function shareSummary(shares: Share[], exponent: number, code: string): string {
  const owed = shares.map((s) => s.owedMinor);
  const hi = Math.max(...owed);
  const lo = Math.min(...owed);
  const f = (m: number) => formatMinor(m, exponent, code);
  return hi === lo ? `${f(hi)} each` : `${f(hi)} or ${f(lo)} each`;
}

// Custom amounts: the user types each share. What is left to assign is total minus everything entered
// (positive = still to assign, negative = over). A custom split is only valid when nothing is left.
export const customRemaining = (totalMinor: number, enteredMinor: number[]): number =>
  totalMinor - enteredMinor.reduce((s, m) => s + m, 0);

// People with no amount are not in the split. Sorted by member id like every other method.
export function customShares(entered: Record<string, number>): Share[] {
  return Object.entries(entered)
    .filter(([, owedMinor]) => owedMinor > 0)
    .map(([memberId, owedMinor]) => ({ memberId, owedMinor }))
    .sort((a, b) => (a.memberId < b.memberId ? -1 : 1));
}

// Null when the custom split can be saved, otherwise the reason in plain words.
export function customError(totalMinor: number, shares: Share[], exponent: number, code: string): string | null {
  if (shares.length === 0) return "Enter an amount for at least one person.";
  const left = customRemaining(totalMinor, shares.map((s) => s.owedMinor));
  if (left === 0) return null;
  const f = formatMinor(Math.abs(left), exponent, code);
  return left > 0 ? `${f} still to assign. Amounts must add up to the total.` : `Over by ${f}. Amounts must add up to the total.`;
}

// Percentages are integer basis points: 100% = 10000, 33.33% = 3333.
export const PERCENT_TOTAL = 10000;

export const formatPercent = (bp: number): string => `${Math.floor(bp / 100)}.${String(bp % 100).padStart(2, "0")}`;

// Proportional split by largest remainder: each person gets floor(amount * weight / denominator), and the leftover minor
// units go one each to the biggest fractional remainders, ties by member id. BigInt keeps amount * weight exact.
function proportional(amountMinor: number, weights: [string, number][], denominator: number): Share[] {
  const total = BigInt(amountMinor);
  const den = BigInt(denominator);
  const rows = weights.map(([memberId, w]) => {
    const exact = total * BigInt(w);
    return { memberId, floor: exact / den, rem: exact % den };
  });
  const leftover = Number(total - rows.reduce((s, r) => s + r.floor, 0n));
  const winners = new Set(
    [...rows].sort((a, b) => (a.rem === b.rem ? (a.memberId < b.memberId ? -1 : 1) : a.rem > b.rem ? -1 : 1))
      .slice(0, leftover).map((r) => r.memberId),
  );
  return rows
    .map((r) => ({ memberId: r.memberId, owedMinor: Number(r.floor) + (winners.has(r.memberId) ? 1 : 0) }))
    .sort((a, b) => (a.memberId < b.memberId ? -1 : 1));
}

export function splitPercentage(amountMinor: number, bpByMember: Record<string, number>): Share[] {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) throw new Error("amount must be a positive integer");
  const entries = Object.entries(bpByMember).filter(([, bp]) => bp > 0);
  if (entries.length === 0) throw new Error("at least one participant is required");
  if (entries.some(([, bp]) => !Number.isInteger(bp)) || entries.reduce((s, [, bp]) => s + bp, 0) !== PERCENT_TOTAL) {
    throw new Error("percentages must total 100%");
  }
  return proportional(amountMinor, entries, PERCENT_TOTAL);
}

// Share-based split (e.g. nights stayed): each person's amount is proportional to their whole-number shares.
export function splitShares(amountMinor: number, sharesByMember: Record<string, number>): Share[] {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) throw new Error("amount must be a positive integer");
  const entries = Object.entries(sharesByMember).filter(([, n]) => n > 0);
  if (entries.length === 0) throw new Error("at least one participant is required");
  if (entries.some(([, n]) => !Number.isInteger(n))) throw new Error("shares must be whole numbers");
  return proportional(amountMinor, entries, entries.reduce((s, [, n]) => s + n, 0));
}

// Null when at least one person has a share, otherwise the reason.
export const sharesError = (sharesByMember: Record<string, number>): string | null =>
  Object.values(sharesByMember).some((n) => n > 0) ? null : "Enter shares for at least one person.";

// Null when the percentages total exactly 100%, otherwise the reason in plain words.
export function percentError(bpByMember: Record<string, number>): string | null {
  const entered = Object.values(bpByMember).filter((bp) => bp > 0);
  if (entered.length === 0) return "Enter a percentage for at least one person.";
  const left = PERCENT_TOTAL - entered.reduce((s, bp) => s + bp, 0);
  if (left === 0) return null;
  return left > 0 ? `${formatPercent(left)}% still to assign. Percentages must total 100%.` : `Over by ${formatPercent(-left)}%. Percentages must total 100%.`;
}
