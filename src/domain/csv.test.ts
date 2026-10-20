import { csvCell, expensesCsv, minorToDecimal, paymentsCsv } from "./csv";

const cur = { code: "INR", exponent: 2 };
const row = { date: "2026-03-01", title: "Dinner", category: "food", amountMinor: 125050, paidBy: "Asha", addedBy: "Ravi", method: "equal", participants: [{ name: "Asha", owedMinor: 62525 }, { name: "Ravi", owedMinor: 62525 }] };

describe("RC-05 minorToDecimal", () => {
  it("formats by exponent without floats", () => {
    expect(minorToDecimal(125050, 2)).toBe("1250.50");
    expect(minorToDecimal(1250, 0)).toBe("1250");
    expect(minorToDecimal(125050, 3)).toBe("125.050");
    expect(minorToDecimal(0, 2)).toBe("0.00");
    expect(minorToDecimal(5, 2)).toBe("0.05");
    expect(minorToDecimal(5, 3)).toBe("0.005");
    expect(minorToDecimal(9007199254740991, 2)).toBe("90071992547409.91");
  });
  it("round-trips every amount in a range", () => {
    for (const e of [0, 2, 3]) for (let n = 0; n < 5000; n += 7) expect(Number(minorToDecimal(n, e).replace(".", ""))).toBe(n);
  });
});

describe("RC-05 csvCell", () => {
  it("quotes commas, quotes and line breaks", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("a\nb")).toBe('"a\nb"');
    expect(csvCell("plain")).toBe("plain");
  });
  it("neutralises formulas", () => {
    for (const bad of ["=SUM(A1)", "+1", "-1", "@cmd", "\tx", "\rx"]) expect(csvCell(bad).replace(/^"/, "").startsWith("'")).toBe(true);
  });
});

describe("RC-05 expensesCsv", () => {
  const out = expensesCsv([row], cur);
  it("has a BOM, CRLF and one row per expense", () => {
    expect(out.startsWith("﻿date,title")).toBe(true);
    expect(out.split("\r\n")).toHaveLength(3);
  });
  it("keeps paid_by and added_by apart and lists each participant's amount", () => {
    expect(out).toContain('2026-03-01,Dinner,food,1250.50,125050,INR,Asha,Ravi,equal,Asha: 625.25; Ravi: 625.25');
  });
  it("does not merge two guests with the same name", () => {
    const two = expensesCsv([{ ...row, participants: [{ name: "Sam", owedMinor: 1 }, { name: "Sam", owedMinor: 2 }] }], cur);
    expect(two).toContain("Sam: 0.01; Sam: 0.02");
  });
  it("guards a formula in a title", () => {
    expect(expensesCsv([{ ...row, title: "=HYPERLINK(x)" }], cur)).toContain(",'=HYPERLINK(x),");
  });
});

describe("RC-05 paymentsCsv", () => {
  it("lists payments and reversals", () => {
    const out = paymentsCsv([{ date: "2026-03-02", type: "reversal", from: "A", to: "B", amountMinor: 5000 }], cur);
    expect(out).toContain("2026-03-02,reversal,A,B,50.00,5000,INR");
  });
});

import { exportRows } from "./csv";
describe("RC-05 exportRows", () => {
  const names = new Map([["m1", "Sam"], ["m2", "Sam"]]);
  it("looks names up by id, so two people called Sam stay apart, and sorts by date", () => {
    const r = exportRows(
      [{ id: "e2", title: "B", amount_minor: "200", expense_date: "2026-03-02", category: "food", split_method: "equal", paid_by_member_id: "m2", created_by_member_id: "m1" },
       { id: "e1", title: "A", amount_minor: 100, expense_date: "2026-03-01", category: "food", split_method: "equal", paid_by_member_id: "m1", created_by_member_id: "m1" }],
      [{ expense_id: "e1", trip_member_id: "m1", owed_amount_minor: 60 }, { expense_id: "e1", trip_member_id: "m2", owed_amount_minor: "40" }],
      [{ kind: "reversal", from_member_id: "m1", to_member_id: "gone", amount_minor: 5, settlement_date: "2026-03-03" }], names);
    expect(r.expenses.map((e) => e.title)).toEqual(["A", "B"]);
    expect(r.expenses[0].participants).toEqual([{ name: "Sam", owedMinor: 60 }, { name: "Sam", owedMinor: 40 }]);
    expect(r.expenses[1].amountMinor).toBe(200);
    expect(r.payments[0]).toMatchObject({ type: "reversal", to: "Someone", amountMinor: 5 });
  });
});
