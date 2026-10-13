import { mrzLines, passportNumber } from "./passportDetails";

test("US-31 the passport number is two country letters and seven digits, and never changes for the same person", () => {
  const n = passportNumber("IN", "Praveen Kumar", "2026-09-29");
  expect(n).toMatch(/^IN\d{7}$/);
  expect(passportNumber("IN", "Praveen Kumar", "2026-09-29")).toBe(n);
  expect(passportNumber("IN", "Asha", "2026-09-29")).not.toBe(n);
  expect(passportNumber(null, "Asha", "2026-09-29")).toMatch(/^AA\d{7}$/);
});

test("US-31 the machine-readable lines are 30 characters of capitals, digits and <, with the last word of the name as the surname", () => {
  const [a, b] = mrzLines({ iso3: "IND", name: "Rahul Kumar", number: "IN1234567", issued: "2026-09-29" });
  expect(a).toBe("P<INDKUMAR<<RAHUL<<<<<<<<<<<<<");
  expect(b).toBe("IN1234567<IND260929<<<<<<<<<<<");
  for (const line of [a, b]) expect(line).toMatch(/^[A-Z0-9<]{30}$/);
});

test("US-31 accents and symbols are dropped, a long name is cut to fit, and an empty name still prints", () => {
  expect(mrzLines({ iso3: "FRA", name: "Zoë O'Brien-Smith 2nd", number: "FR0000001", issued: "2026-01-02" })[0]).toMatch(/^P<FRA[A-Z<]{25}$/);
  expect(mrzLines({ iso3: "IND", name: "A".repeat(80), number: "IN0000000", issued: "2026-01-02" })[0]).toHaveLength(30);
  expect(mrzLines({ iso3: "IND", name: "  ", number: "IN0000000", issued: "2026-01-02" })[0]).toBe("P<INDTRAVELLER<<<<<<<<<<<<<<<<");
});
