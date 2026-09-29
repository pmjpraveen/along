import { formatMinor } from "./money";

// Positive net = the group owes them; negative = they owe the group. Plain words, never debit/credit.
export function describeBalance(net: number, name: string, isMe: boolean, exponent: number, code: string): string {
  const amount = formatMinor(Math.abs(net), exponent, code);
  if (net === 0) return isMe ? "You're settled up" : `${name} is settled up`;
  if (net > 0) return isMe ? `You're owed ${amount}` : `${name} is owed ${amount}`;
  return isMe ? `You owe ${amount}` : `${name} owes ${amount}`;
}
