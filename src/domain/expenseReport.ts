import { esc } from "./balanceReport";
import { ExportCurrency, ExportExpense } from "./csv";
import { formatMinor } from "./money";

// The trip's expenses as a printable page: date, what, who paid, amount, and the total. Pure: the caller gives the date.
export function expenseReportHtml({ tripName, currency, expenses, generatedOn }: { tripName: string; currency: ExportCurrency; expenses: ExportExpense[]; generatedOn: string }): string {
  const money = (n: number) => formatMinor(n, currency.exponent, currency.code);
  const total = expenses.reduce((n, e) => n + e.amountMinor, 0);
  const body = expenses.map((e) => `<tr><td>${esc(e.date)}</td><td>${esc(e.title)}</td><td>${esc(e.paidBy)}</td><td class="n">${money(e.amountMinor)}</td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#222;margin:32px;font-size:12px}
h1{font-size:22px;margin:0 0 4px}.sub{color:#6a6a6a;margin:0}
table{width:100%;border-collapse:collapse;margin-top:16px}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid #e6e6e6}th{color:#6a6a6a;font-weight:500}thead{display:table-header-group}tr{break-inside:avoid}
.n{text-align:right;font-variant-numeric:tabular-nums}tfoot td{border-top:2px solid #222;font-weight:600}
</style></head><body>
<p class="sub">along</p><h1>${esc(tripName)}: expenses</h1><p class="sub">Generated on ${esc(generatedOn)} · Amounts in ${esc(currency.code)}</p>
<table><thead><tr><th>Date</th><th>What</th><th>Paid by</th><th class="n">Amount</th></tr></thead><tbody>${body}</tbody>
<tfoot><tr><td colspan="3">Total</td><td class="n">${money(total)}</td></tr></tfoot></table>
</body></html>`;
}
