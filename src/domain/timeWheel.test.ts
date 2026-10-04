import { wheelIndex } from "./timeWheel";

test("US-03 a wheel settles on the nearest row, and never past either end", () => {
  expect(wheelIndex(0, 44, 24)).toBe(0);
  expect(wheelIndex(43, 44, 24)).toBe(1);
  expect(wheelIndex(21, 44, 24)).toBe(0);
  expect(wheelIndex(23 * 44, 44, 24)).toBe(23);
  expect(wheelIndex(9999, 44, 24)).toBe(23);
  expect(wheelIndex(-80, 44, 24)).toBe(0);
});

test("US-03 every row of an hour and a minute wheel is reachable exactly", () => {
  for (const count of [24, 60]) for (let i = 0; i < count; i++) expect(wheelIndex(i * 44, 44, count)).toBe(i);
});
