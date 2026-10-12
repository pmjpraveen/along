import type { ImportedItem } from "../domain/importPlan";
import { supabase } from "./supabase";

export type ImportResult = { ok: true; items: ImportedItem[] } | { ok: false; message: string };

const MESSAGES: Record<string, string> = {
  too_short: "Paste a bit more text, like the whole itinerary.",
  too_long: "That's a lot of text. Paste just the itinerary part.",
  limit: "You've reached today's import limit. Try again tomorrow, or add plans one by one.",
  forbidden: "Only people on this trip can import plans.",
  busy: "The free reader is busy right now. Wait a minute and try again.",
  not_configured: "Import isn't available yet. Try again later.",
};

// Asks the import function to read the pasted text. Nothing is saved: the caller shows the plans for review first.
export async function importItems(tripId: string, text: string): Promise<ImportResult> {
  try {
    const { data, error } = await supabase.functions.invoke("import-itinerary", { body: { tripId, text } });
    if (!error) return { ok: true, items: data?.items ?? [] };
    const code = await (error as { context?: Response }).context?.json?.().then((b: { error?: string }) => b.error).catch(() => undefined);
    if (code && MESSAGES[code]) return { ok: false, message: MESSAGES[code] };
    return { ok: false, message: /network|fetch/i.test(error.message) ? "You're offline. Your text is still here, try again when you're back online." : "Couldn't read that text. Try again." };
  } catch {
    return { ok: false, message: "You're offline. Your text is still here, try again when you're back online." };
  }
}
