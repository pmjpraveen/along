import { loadExpenseExport } from "./api/expenses";
import { expensesCsv, paymentsCsv } from "./domain/csv";
import { expenseReportHtml } from "./domain/expenseReport";

type Done = { ok: true } | { ok: false; message: string };
const safe = (s: string) => s.replace(/[\\/:*?"<>|]/g, "-").trim() || "Trip";

// Loads the trip's expenses and opens the share sheet with a spreadsheet (and, when asked, a second one for payments) or a PDF. expo-print, expo-sharing and
// expo-file-system are native modules, so they are required lazily: a build made before they were added comes back as { ok: false } for the caller to say so.
export async function exportExpenses(tripId: string, kind: "csv" | "pdf", withPayments: boolean, now: Date): Promise<Done> {
  const data = await loadExpenseExport(tripId, kind === "csv" && withPayments);
  if (!data.ok) return data;
  if (data.expenses.length === 0) return { ok: false, message: "No expenses to export yet." };
  try {
    const Sharing = require("expo-sharing") as typeof import("expo-sharing");
    if (!(await Sharing.isAvailableAsync())) return { ok: false, message: "Sharing isn't available on this device." };
    const FS = require("expo-file-system/legacy") as typeof import("expo-file-system/legacy");
    const name = safe(data.tripName);
    const write = async (file: string, text: string) => { const uri = `${FS.cacheDirectory}${file}`; await FS.writeAsStringAsync(uri, text); return uri; };
    if (kind === "pdf") {
      const Print = require("expo-print") as typeof import("expo-print");
      const generatedOn = now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      const printed = await Print.printToFileAsync({ html: expenseReportHtml({ tripName: data.tripName, currency: data.currency, expenses: data.expenses, generatedOn }) });
      const uri = `${FS.cacheDirectory}${name} - expenses.pdf`;
      await FS.deleteAsync(uri, { idempotent: true });
      await FS.moveAsync({ from: printed.uri, to: uri });
      await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: `${data.tripName}: expenses` });
    } else {
      await Sharing.shareAsync(await write(`${name} - expenses.csv`, expensesCsv(data.expenses, data.currency)), { mimeType: "text/csv", UTI: "public.comma-separated-values-text", dialogTitle: `${data.tripName}: expenses` });
      // The share sheet takes one file, so payments (when asked for) follow as a second sheet.
      if (withPayments && data.payments.length > 0) await Sharing.shareAsync(await write(`${name} - payments.csv`, paymentsCsv(data.payments, data.currency)), { mimeType: "text/csv", UTI: "public.comma-separated-values-text", dialogTitle: `${data.tripName}: payments` });
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't make the file. Update the app and try again." };
  }
}
