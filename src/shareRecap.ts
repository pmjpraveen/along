import type { SkImage } from "@shopify/react-native-skia";

// Saves the photographed card as a PNG named after the trip and opens the share sheet (Instagram, Messages, Save Image...). The native modules are required
// lazily, so an older build comes back as { ok: false } instead of crashing.
export async function shareRecapImage(image: SkImage, tripName: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const Sharing = require("expo-sharing") as typeof import("expo-sharing");
    const FS = require("expo-file-system/legacy") as typeof import("expo-file-system/legacy");
    if (!(await Sharing.isAvailableAsync())) return { ok: false, message: "Sharing isn't available on this device." };
    const uri = `${FS.cacheDirectory}${tripName.replace(/[\\/:*?"<>|]/g, "-").trim() || "Trip"} - recap.png`;
    await FS.writeAsStringAsync(uri, image.encodeToBase64(), { encoding: FS.EncodingType.Base64 });
    await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png", dialogTitle: `${tripName} on along` });
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't share the card. Try again." };
  }
}
