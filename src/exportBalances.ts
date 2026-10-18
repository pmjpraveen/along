import { balanceReportHtml, ReportInput } from "./domain/balanceReport";

// Makes the balances PDF and opens the share sheet (save to Files, send, print). expo-print and expo-sharing are native modules, so a build made
// before they were added cannot load them: they are required lazily, and that case comes back as { ok: false } for the caller to say so.
export async function exportBalancesPdf(input: Omit<ReportInput, "generatedOn">, now: Date): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const Print = require("expo-print") as typeof import("expo-print");
    const Sharing = require("expo-sharing") as typeof import("expo-sharing");
    const generatedOn = now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const printed = await Print.printToFileAsync({ html: balanceReportHtml({ ...input, generatedOn }) });
    // The print file has a random name, and that is the name shown when it is shared or saved: give it the trip's name.
    let uri = printed.uri;
    try {
      const FS = require("expo-file-system/legacy") as typeof import("expo-file-system/legacy");
      const named = `${FS.cacheDirectory}${input.tripName.replace(/[\\/:*?"<>|]/g, "-").trim() || "Trip"} - balances.pdf`;
      await FS.deleteAsync(named, { idempotent: true });
      await FS.moveAsync({ from: printed.uri, to: named });
      uri = named;
    } catch {
      // keep the random name rather than fail the export
    }
    if (!(await Sharing.isAvailableAsync())) return { ok: false, message: "Sharing isn't available on this device." };
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: `${input.tripName}: balances` });
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't make the PDF. Update the app and try again." };
  }
}
