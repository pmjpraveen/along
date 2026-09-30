// What a row in the expense list says about me, in plain words. Order matters: if I paid, that is the story; else if I owe a share,
// I owe the payer; else I only see it because I organise the trip, so it says who added it.
export function expenseLine(x: { meId: string | null; paidById: string; addedById: string; paidBy: string; addedBy: string; myShareMinor: number }): string {
  if (x.meId && x.paidById === x.meId) return "Paid by You";
  if (x.myShareMinor > 0) return `Owed to ${x.paidBy}`;
  return `Added by ${x.meId && x.addedById === x.meId ? "You" : x.addedBy}`;
}

// Each person's share of the total in basis points (10000 = 100%), rounded, for showing the split ratio.
export const shareBp = (owedMinor: number, totalMinor: number): number => (totalMinor > 0 ? Math.round((owedMinor * 10000) / totalMinor) : 0);

export const METHOD_LABEL = { equal: "Split equally", custom: "Custom amounts", percentage: "By percentage", shares: "By shares" } as const;
