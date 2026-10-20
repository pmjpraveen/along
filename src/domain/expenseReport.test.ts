import { expenseReportHtml } from "./expenseReport";

const e = (title: string, amountMinor: number) => ({ date: "2026-03-01", title, category: "food", amountMinor, paidBy: "Asha", addedBy: "Asha", method: "equal", participants: [] });

test("RC-06 lists every expense, escapes text and totals them", () => {
  const html = expenseReportHtml({ tripName: "Goa <3", currency: { code: "INR", exponent: 2 }, expenses: [e("Lunch", 10050), e("<b>x</b>", 5000)], generatedOn: "1 Mar 2026" });
  expect(html).toContain("Goa &lt;3: expenses");
  expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
  expect(html).toContain("₹100.50");
  expect(html).toContain("<td class=\"n\">₹150.50</td></tr></tfoot>");
});
