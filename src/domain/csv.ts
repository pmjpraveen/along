// Spreadsheet export. Money stays integer minor units and is turned into a decimal string by string maths, never a float.

export type ExportCurrency = { code: string; exponent: number };
export type ExportExpense = { date: string; title: string; category: string; amountMinor: number; paidBy: string; addedBy: string; method: string; participants: { name: string; owedMinor: number }[] };
export type ExportPayment = { date: string; type: "payment" | "reversal"; from: string; to: string; amountMinor: number };

// 125050 with exponent 2 -> "1250.50"; exponent 0 -> "1250"; exponent 3 -> "125.050".
export function minorToDecimal(minor: number, exponent: number): string {
  const abs = String(Math.abs(minor)).padStart(exponent + 1, "0");
  const whole = abs.slice(0, abs.length - exponent);
  return `${minor < 0 ? "-" : ""}${whole}${exponent ? `.${abs.slice(abs.length - exponent)}` : ""}`;
}

// A text cell. A leading = + - @ (or tab/CR) would run as a formula in Excel and Sheets, so it gets a quote in front; commas, quotes and line breaks are quoted.
export function csvCell(text: string): string {
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

// UTF-8 byte order mark so Excel reads ₹, accents and emoji correctly; CRLF line ends.
const file = (lines: string[][]) => `﻿${lines.map((l) => l.join(",")).join("\r\n")}\r\n`;

export function expensesCsv(rows: ExportExpense[], cur: ExportCurrency): string {
  const dec = (n: number) => minorToDecimal(n, cur.exponent);
  return file([
    ["date", "title", "category", "amount", "amount_minor", "currency", "paid_by", "added_by", "split_method", "participants"],
    ...rows.map((r) => [r.date, csvCell(r.title), csvCell(r.category), dec(r.amountMinor), String(r.amountMinor), cur.code, csvCell(r.paidBy), csvCell(r.addedBy), r.method,
      csvCell(r.participants.map((p) => `${p.name}: ${dec(p.owedMinor)}`).join("; "))]),
  ]);
}

export function paymentsCsv(rows: ExportPayment[], cur: ExportCurrency): string {
  return file([
    ["date", "type", "from", "to", "amount", "amount_minor", "currency"],
    ...rows.map((r) => [r.date, r.type, csvCell(r.from), csvCell(r.to), minorToDecimal(r.amountMinor, cur.exponent), String(r.amountMinor), cur.code]),
  ]);
}

type RawExpense = { id: string; title: string; amount_minor: number | string; expense_date: string; category: string; split_method: string; paid_by_member_id: string; created_by_member_id: string };
type RawShare = { expense_id: string; trip_member_id: string; owed_amount_minor: number | string };
type RawPayment = { kind: string; from_member_id: string; to_member_id: string; amount_minor: number | string; settlement_date: string };

// Joins what the server returned into export rows, oldest first. Names are looked up by member id, so two people with the same name stay two people.
export function exportRows(expenses: RawExpense[], shares: RawShare[], payments: RawPayment[], names: Map<string, string>) {
  const who = (id: string) => names.get(id) ?? "Someone";
  const parts = new Map<string, { name: string; owedMinor: number }[]>();
  for (const s of shares) parts.set(s.expense_id, [...(parts.get(s.expense_id) ?? []), { name: who(s.trip_member_id), owedMinor: Number(s.owed_amount_minor) }]);
  return {
    expenses: [...expenses].sort((a, b) => a.expense_date.localeCompare(b.expense_date)).map((e): ExportExpense => ({
      date: e.expense_date, title: e.title, category: e.category, amountMinor: Number(e.amount_minor), paidBy: who(e.paid_by_member_id),
      addedBy: who(e.created_by_member_id), method: e.split_method, participants: parts.get(e.id) ?? [],
    })),
    payments: [...payments].sort((a, b) => a.settlement_date.localeCompare(b.settlement_date)).map((p): ExportPayment => ({
      date: p.settlement_date, type: p.kind === "reversal" ? "reversal" : "payment", from: who(p.from_member_id), to: who(p.to_member_id), amountMinor: Number(p.amount_minor),
    })),
  };
}
