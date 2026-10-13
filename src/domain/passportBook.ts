// The passport as an open book lying flat: two pages side by side with the spine down the middle. Halves are listed in order: the cover, then the data page (the upper page of the first spread),
// then the stamp pages, so the first stamp page sits below the data page. Spread s shows halves[2s-1] on the left and halves[2s] on the right, so spread 0 is the closed book (the cover alone on the right) and
// each turn lifts the right page over the spine onto the left (or brings the left page back). The list always has an odd length so every spread is complete.
export type Half<T> = { kind: "cover" } | { kind: "details" } | { kind: "blank" } | { kind: "stamps"; items: T[]; page: number };

export function bookHalves<T>(items: T[], perPage: number): Half<T>[] {
  const halves: Half<T>[] = [{ kind: "cover" }, { kind: "details" }];
  const size = Math.max(1, Math.floor(perPage));
  for (let i = 0; i < items.length; i += size) halves.push({ kind: "stamps", items: items.slice(i, i + size), page: i / size + 1 });
  if (halves.length % 2 === 0) halves.push({ kind: "blank" });
  return halves;
}

export const lastSpread = (halves: unknown[]): number => (halves.length - 1) / 2;
