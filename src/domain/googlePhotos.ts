// Google Photos links for the Memories screen. Only addresses Google really uses for shared albums and photos are accepted.
const GOOGLE_PHOTOS = /^https:\/\/(photos\.app\.goo\.gl|photos\.google\.com)\/[^\s]+$/i;

// The first word of the pasted text that is a Google Photos link, with https added when it has no scheme (and http upgraded), or null. Each word is
// checked whole, so an address on another site that merely mentions a Google Photos host in its path is refused.
export function googlePhotosUrl(text: string): string | null {
  for (const word of text.trim().split(/\s+/)) {
    const url = /^https?:\/\//i.test(word) ? word.replace(/^http:\/\//i, "https://") : `https://${word}`;
    if (GOOGLE_PHOTOS.test(url)) return url;
  }
  return null;
}

export type LinkPreview = { title: string | null; image: string | null };

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'", "&#x27;": "'" };
const decode = (s: string) => s.replace(/&(amp|lt|gt|quot|apos|#39|#x27);/g, (m) => ENTITIES[m] ?? m);

// The page's own title and picture, from its Open Graph tags (the same ones chat apps use to draw a link card). Attribute order varies, so each
// <meta> tag is read as a whole. The picture must be https. Anything missing comes back as null.
export function parseLinkPreview(html: string): LinkPreview {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const read = (name: string): string | null => {
    for (const tag of tags) {
      const key = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
      if (key !== name) continue;
      const value = tag.match(/\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i);
      const text = decode((value?.[1] ?? value?.[2] ?? "").trim());
      if (text) return text;
    }
    return null;
  };
  const image = read("og:image");
  return { title: read("og:title"), image: image && /^https:\/\//i.test(image) ? image : null };
}
