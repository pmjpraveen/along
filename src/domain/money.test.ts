import { formatMinor, parseMinor } from "./money";

test("US-05 parses two-decimal amounts into minor units", () => {
  expect(parseMinor("12.50", 2)).toBe(1250);
  expect(parseMinor("12.5", 2)).toBe(1250);
  expect(parseMinor("12", 2)).toBe(1200);
  expect(parseMinor("0.05", 2)).toBe(5);
  expect(parseMinor("1,250.75", 2)).toBe(125075);
  expect(parseMinor(" 800 ", 2)).toBe(80000);
  expect(parseMinor("12.", 2)).toBe(1200);
});

test("US-05 zero-decimal currencies take whole numbers only", () => {
  expect(parseMinor("500", 0)).toBe(500);
  expect(parseMinor("500.5", 0)).toBeNull();
});

test("US-05 three-decimal currencies keep three places", () => {
  expect(parseMinor("1.5", 3)).toBe(1500);
  expect(parseMinor("1.234", 3)).toBe(1234);
  expect(parseMinor("1.2345", 3)).toBeNull();
});

test("US-05 rejects empty, zero, negative, junk and absurd amounts", () => {
  for (const bad of ["", "  ", "0", "0.00", "-5", "abc", "1.2.3", "1e5", ".", "9999999999999999"]) {
    expect(parseMinor(bad, 2)).toBeNull();
  }
});

test("US-05 amounts are exact for every value in a range, no float drift", () => {
  for (let minor = 1; minor <= 5000; minor++) {
    const text = `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, "0")}`;
    expect(parseMinor(text, 2)).toBe(minor);
  }
});

test("US-05 formats by the currency's exponent with grouping", () => {
  expect(formatMinor(1250, 2, "INR")).toBe("₹12.50");
  expect(formatMinor(123456789, 2, "INR")).toBe("₹1,234,567.89");
  expect(formatMinor(500, 0, "JPY")).toBe("¥500");
  expect(formatMinor(1234, 3, "KWD")).toMatch(/1\.234$/);
  expect(formatMinor(5, 2, "USD")).toBe("$0.05");
});
