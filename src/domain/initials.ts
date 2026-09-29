// "Jane Wilson" -> "JW", "Rahul" -> "R", "  " -> "". First letters of the first two words, upper case.
export const initialsOf = (name: string): string =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => Array.from(w)[0]?.toUpperCase() ?? "").join("");
