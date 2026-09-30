import { COUNTRIES, countryName, flagOf, PASSPORTS } from "./countries";

test("codes are unique upper-case pairs, the list is sorted by name, and a code becomes its name and flag", () => {
  expect(new Set(COUNTRIES.map((c) => c.code)).size).toBe(COUNTRIES.length);
  expect(COUNTRIES.every((c) => /^[A-Z]{2}$/.test(c.code))).toBe(true);
  expect(COUNTRIES.map((c) => c.name)).toEqual([...COUNTRIES.map((c) => c.name)].sort());
  expect(countryName("IN")).toBe("India");
  expect(countryName(null)).toBe("Not set");
  expect(flagOf("IN")).toBe("\u{1F1EE}\u{1F1F3}");
});

test("every country has a passport: a three-letter code and a hex cover colour, and no passport exists for a country we don't list", () => {
  for (const c of COUNTRIES) {
    expect(PASSPORTS[c.code]).toBeDefined();
    expect(PASSPORTS[c.code].iso3).toMatch(/^[A-Z]{3}$/);
    expect(PASSPORTS[c.code].cover).toMatch(/^#[0-9a-f]{6}$/);
  }
  expect(Object.keys(PASSPORTS).sort()).toEqual(COUNTRIES.map((c) => c.code).sort());
});
