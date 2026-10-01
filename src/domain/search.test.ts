import { matches } from "./search";

test("search ignores case and accents, needs every word, and an empty search matches everything", () => {
  expect(matches("cote", "Côte d'Ivoire")).toBe(true);
  expect(matches("us dol", "US Dollar", "USD")).toBe(true);
  expect(matches("usd", "US Dollar", "USD")).toBe(true);
  expect(matches("rupee pak", "Indian Rupee", "INR")).toBe(false);
  expect(matches("  ", "Anything")).toBe(true);
});
