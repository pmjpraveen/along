const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// True when every word typed appears in one of the fields, ignoring case and accents ("cote" finds "Côte d'Ivoire", "us dol" finds "US Dollar").
export const matches = (query: string, ...fields: string[]): boolean => {
  const hay = fold(fields.join(" "));
  return fold(query).split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
};
