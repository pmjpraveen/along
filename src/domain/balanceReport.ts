import { formatMinor } from "./money";

export type ReportRow = { memberId: string; name: string; guest: boolean; net: number; costMinor: number; paidMinor: number };
export type ReportTransfer = { from: string; to: string; amountMinor: number };
export type ReportInput = { tripName: string; currency: { code: string; exponent: number }; rows: ReportRow[]; transfers: ReportTransfer[]; generatedOn: string };

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The balances as a printable page: each person's paid, share, payments already recorded and what they get back or owe (the four always add up),
// then who pays whom. Pure: the caller gives the date, so the same input always gives the same page.
export function balanceReportHtml({ tripName, currency, rows, transfers, generatedOn }: ReportInput): string {
  const money = (n: number) => formatMinor(n, currency.exponent, currency.code);
  const signed = (n: number) => (n === 0 ? money(0) : `${n < 0 ? "−" : "+"}${money(Math.abs(n))}`);
  const nameOf = (id: string) => esc(rows.find((r) => r.memberId === id)?.name ?? "Someone");
  const people = [...rows].sort((a, b) => b.net - a.net || a.name.localeCompare(b.name));
  const status = (n: number) => (n > 0 ? `Gets back ${money(n)}` : n < 0 ? `Owes ${money(-n)}` : "Settled up");
  const body = people.map((r) => `<tr><td>${esc(r.name)}${r.guest ? " <span class=\"tag\">Guest</span>" : ""}</td><td class="n">${money(r.paidMinor)}</td><td class="n">${money(r.costMinor)}</td><td class="n">${signed(r.net - (r.paidMinor - r.costMinor))}</td><td class="n b">${status(r.net)}</td></tr>`).join("");
  const sum = (pick: (r: ReportRow) => number) => rows.reduce((n, r) => n + pick(r), 0);
  const pays = transfers.length === 0
    ? `<p>Everyone is settled up.</p>`
    : `<table><thead><tr><th>Who pays</th><th>Who gets paid</th><th class="n">Amount</th></tr></thead><tbody>${transfers.map((t) => `<tr><td>${nameOf(t.from)}</td><td>${nameOf(t.to)}</td><td class="n b">${money(t.amountMinor)}</td></tr>`).join("")}</tbody></table>`;
  // One block per person, the same shape for everyone: the arithmetic, then whom they pay and who pays them.
  const detail = people.map((r) => {
    const recorded = r.net - (r.paidMinor - r.costMinor);
    const pay = transfers.filter((t) => t.from === r.memberId);
    const get = transfers.filter((t) => t.to === r.memberId);
    const list = (head: string, items: ReportTransfer[], other: "from" | "to") => items.length === 0 ? "" : `<p class="h">${head}</p><table>${items.map((t) => `<tr><td>${nameOf(t[other])}</td><td class="n b">${money(t.amountMinor)}</td></tr>`).join("")}</table>`;
    return `<div class="card"><div class="top"><span class="who">${esc(r.name)}${r.guest ? " <span class=\"tag\">Guest</span>" : ""}</span><span class="b">${status(r.net)}</span></div>
<table><tr><td>${esc(r.name)} paid for the group</td><td class="n">${money(r.paidMinor)}</td></tr><tr><td>${esc(r.name)}'s share of all expenses</td><td class="n">${signed(-r.costMinor)}</td></tr>${recorded === 0 ? "" : `<tr><td>Payments already recorded</td><td class="n">${signed(recorded)}</td></tr>`}<tr class="sum"><td>${r.net > 0 ? "Gets back" : r.net < 0 ? "Still needs to pay" : "Balance"}</td><td class="n">${r.net === 0 ? "Settled up" : money(Math.abs(r.net))}</td></tr></table>
${list(`${esc(r.name)} needs to pay`, pay, "to")}${list(`${esc(r.name)} gets paid by`, get, "from")}</div>`;
  }).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#222;margin:32px;font-size:12px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:14px;margin:28px 0 8px}.sub{color:#6a6a6a;margin:0}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid #e6e6e6}th{color:#6a6a6a;font-weight:500}
.n{text-align:right;font-variant-numeric:tabular-nums}.b{font-weight:600}.tag{color:#6a6a6a;font-size:10px;border:1px solid #bbb;border-radius:8px;padding:0 5px}
.card{border:1px solid #e6e6e6;border-radius:12px;padding:12px 14px;margin-bottom:12px;break-inside:avoid}.top{display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px}.who{font-weight:600}.h{margin:10px 0 2px;font-weight:600}.sum td{border-top:1px solid #222;font-weight:600}.card td{padding:5px 2px;border-bottom:none}
tfoot td{border-top:2px solid #222;font-weight:600}.foot{color:#6a6a6a;margin-top:24px;font-size:11px}
</style></head><body>
<p class="sub">along</p><h1>${esc(tripName)}: balances</h1><p class="sub">Generated on ${esc(generatedOn)} · Amounts in ${esc(currency.code)}</p>
<h2>Everyone's totals</h2>
<table><thead><tr><th>Person</th><th class="n">Paid</th><th class="n">Share</th><th class="n">Payments recorded</th><th class="n">Balance</th></tr></thead><tbody>${body}</tbody>
<tfoot><tr><td>Total</td><td class="n">${money(sum((r) => r.paidMinor))}</td><td class="n">${money(sum((r) => r.costMinor))}</td><td class="n"></td><td class="n"></td></tr></tfoot></table>
<h2>Who pays whom</h2>${pays}
<h2>Person by person</h2>${detail}
<p class="foot">Balance = paid − share ± payments already recorded. Paid is what someone spent for the group; share is their part of every expense they were in.</p>
</body></html>`;
}
