import { mrzLines, passportNumber } from "./passportDetails";

test("US-31 the passport number is two country letters and seven digits, and never changes for the same person", () => {
  const n = passportNumber("IN", "Praveen Kumar", "2026-09-29");
  expect(n).toMatch(/^IN\d{7}$/);
  expect(passportNumber("IN", "Praveen Kumar", "2026-09-29")).toBe(n);
  expect(passportNumber("IN", "Asha", "2026-09-29")).not.toBe(n);
  expect(passportNumber(null, "Asha", "2026-09-29")).toMatch(/^AA\d{7}$/);
});

test("US-31 the machine-readable lines are 44 characters of capitals, digits and <, with the last word of the name as the surname", () => {
  const [a, b] = mrzLines({ iso3: "IND", name: "Rahul Kumar", number: "IN1234567", issued: "2026-09-29" });
  expect(a).toBe("P<INDKUMAR<<RAHUL".padEnd(44, "<"));
  expect(b.startsWith("IN1234567")).toBe(true);
  for (const line of [a, b]) expect(line).toMatch(/^[A-Z0-9<]{44}$/);
});

test("US-31 the second line is dense: mostly digits and letters, not filler, and the same every time", () => {
  const [, b] = mrzLines({ iso3: "IND", name: "Rahul Kumar", number: "IN1234567", issued: "2026-09-29" });
  expect((b.match(/</g) ?? []).length).toBeLessThanOrEqual(2);
  expect(mrzLines({ iso3: "IND", name: "Rahul Kumar", number: "IN1234567", issued: "2026-09-29" })[1]).toBe(b);
});

test("US-31 accents and symbols are dropped, a long name is cut to fit, and an empty name still prints", () => {
  expect(mrzLines({ iso3: "FRA", name: "Zoë O'Brien-Smith 2nd", number: "FR0000001", issued: "2026-01-02" })[0]).toMatch(/^P<FRA[A-Z<]{39}$/);
  expect(mrzLines({ iso3: "IND", name: "A".repeat(80), number: "IN0000000", issued: "2026-01-02" })[0]).toHaveLength(44);
  expect(mrzLines({ iso3: "IND", name: "  ", number: "IN0000000", issued: "2026-01-02" })[0]).toBe("P<INDTRAVELLER".padEnd(44, "<"));
});
