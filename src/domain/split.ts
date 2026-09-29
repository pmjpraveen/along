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
