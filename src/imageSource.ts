// A storage photo is shown through a signed link whose ?token= changes every time it is signed (every hour, and on each reload), so a cache keyed on the
// whole link treats the same photo as new and downloads it again. Keyed on the link without its token, the photo is fetched once and kept on the phone.
export const cachedSource = (uri: string) => ({ uri, cacheKey: uri.split("?")[0] });

// Uploaded files never change under the same name (each upload gets a new one), so browsers, phones and the CDN may keep them for a year.
export const LONG_CACHE = "31536000";

// Photos are shrunk on the phone before they upload: a camera photo is 2 to 4 MB, but the app shows an avatar at 40 to 72 pt, a cover at screen width and a
// memory at screen width. The longer edge is capped at these sizes (in pixels) and the result is a WebP (about 30% smaller than a JPEG of the same look, and every phone the app runs on can show it), so each upload is tens to a few hundred KB.
export const MAX_EDGE = { avatar: 256, cover: 1280, photo: 1600 } as const;
export const IMAGE_QUALITY = 0.8;

// Returns the shrunk copy's file link, or the original unchanged if it cannot be shrunk (an older build without the native module, an unreadable file):
// the photo is still uploaded, just bigger, rather than failing.
export async function shrink(uri: string, mimeType: string, maxEdge: number): Promise<{ uri: string; mimeType: string }> {
  try {
    const M = require("expo-image-manipulator") as typeof import("expo-image-manipulator");
    const source = await M.ImageManipulator.manipulate(uri).renderAsync();
    const ctx = M.ImageManipulator.manipulate(source);
    if (Math.max(source.width, source.height) > maxEdge) ctx.resize(source.width >= source.height ? { width: maxEdge } : { height: maxEdge });
    const out = await (await ctx.renderAsync()).saveAsync({ format: M.SaveFormat.WEBP, compress: IMAGE_QUALITY });
    return { uri: out.uri, mimeType: "image/webp" };
  } catch {
    return { uri, mimeType };
  }
}
