import { balanceReportHtml } from "./balanceReport";

const cur = { code: "INR", exponent: 2 };
const row = (memberId: string, name: string, net: number, costMinor: number, paidMinor: number, guest = false) => ({ memberId, name, guest, net, costMinor, paidMinor });
const base = { tripName: "Goa", currency: cur, generatedOn: "18 Oct 2026" };

test("balance report: each person's paid, share, recorded payments and balance, with totals", () => {
  const html = balanceReportHtml({ ...base, rows: [row("a", "Asha", 50000, 320000, 400000), row("b", "Ben", -50000, 400000, 320000)], transfers: [{ from: "b", to: "a", amountMinor: 50000 }] });
  expect(html).toContain("Goa: balances");
  expect(html).toContain("₹4,000.00");            // Asha paid
  expect(html).toContain("−₹300.00");             // 4,000 − 3,200 = 800, but 500 is still owed, so 300 was already paid back
  expect(html).toContain("Gets back ₹500.00");
  expect(html).toContain("Owes ₹500.00");
  expect(html).toContain("<td>Ben</td><td>Asha</td>");   // who pays whom
});

test("balance report: a trip with nothing to pay says everyone is settled up", () => {
  const html = balanceReportHtml({ ...base, rows: [row("a", "Asha", 0, 100, 100)], transfers: [] });
  expect(html).toContain("Everyone is settled up.");
  expect(html).toContain("Settled up");
});

test("balance report: names are escaped and guests are tagged", () => {
  const html = balanceReportHtml({ ...base, tripName: "A<b>&", rows: [row("a", "<script>x</script>", 0, 0, 0, true)], transfers: [] });
  expect(html).not.toContain("<script>");
  expect(html).toContain("&lt;script&gt;");
  expect(html).toContain("A&lt;b&gt;&amp;: balances");
  expect(html).toContain("Guest");
});

test("balance report: a currency with no decimals prints whole amounts", () => {
  const html = balanceReportHtml({ ...base, currency: { code: "JPY", exponent: 0 }, rows: [row("a", "Aki", 500, 1000, 1500)], transfers: [] });
  expect(html).toContain("¥1,500");
});

test("balance report: every person gets the same detail block, and nothing is written about 'you'", () => {
  const html = balanceReportHtml({ ...base, rows: [row("a", "Asha", 50000, 320000, 400000), row("b", "Ben", -30000, 200000, 170000), row("c", "Cy", -20000, 200000, 180000)],
    transfers: [{ from: "b", to: "a", amountMinor: 30000 }, { from: "c", to: "a", amountMinor: 20000 }] });
  expect(html).toContain("Person by person");
  for (const n of ["Asha", "Ben", "Cy"]) expect(html).toContain(`${n} paid for the group`);
  expect(html).toContain("Ben needs to pay");
  expect(html).toContain("Asha gets paid by");
  expect(html).toContain("Asha's share of all expenses");
  expect(html).not.toMatch(/\bYou\b|\byou\b/);
});
