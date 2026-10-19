import { cachedSource, LONG_CACHE } from "./imageSource";

test("a storage photo is cached by its link without the signed token", () => {
  expect(cachedSource("https://x.supabase.co/storage/v1/object/sign/memories/t/k.jpg?token=abc")).toEqual({
    uri: "https://x.supabase.co/storage/v1/object/sign/memories/t/k.jpg?token=abc", cacheKey: "https://x.supabase.co/storage/v1/object/sign/memories/t/k.jpg",
  });
  expect(cachedSource("https://x/y.jpg?token=1").cacheKey).toBe(cachedSource("https://x/y.jpg?token=2").cacheKey);
});

test("a plain link keeps itself as the key", () => {
  expect(cachedSource("https://example.com/goa.jpg").cacheKey).toBe("https://example.com/goa.jpg");
});

test("uploads are cached for a year", () => {
  expect(LONG_CACHE).toBe("31536000");
});

// shrink: the native image library is replaced by one that records what it was asked to do.
const mockResize = jest.fn();
let mockSize = { width: 4000, height: 3000 };
let mockFail = false;
jest.mock("expo-image-manipulator", () => {
  const ctx = () => ({
    resize: (s: unknown) => { mockResize(s); return ctx(); },
    renderAsync: async () => { if (mockFail) throw new Error("unreadable"); return { ...mockSize, saveAsync: async (o: unknown) => ({ uri: `file:///small.jpg?${JSON.stringify(o)}` }) }; },
  });
  return { ImageManipulator: { manipulate: () => ctx() }, SaveFormat: { JPEG: "jpeg", WEBP: "webp" } };
});
import { MAX_EDGE, shrink } from "./imageSource";

beforeEach(() => { mockResize.mockClear(); mockFail = false; mockSize = { width: 4000, height: 3000 }; });

test("a landscape photo is scaled so its longer edge is the limit, and saved as a WebP", async () => {
  const r = await shrink("file:///big.heic", "image/heic", MAX_EDGE.photo);
  expect(mockResize).toHaveBeenCalledWith({ width: 1600 });
  expect(r.mimeType).toBe("image/webp");
  expect(r.uri).toContain("small.jpg");
  expect(r.uri).toContain('"format":"webp"');
});

test("a portrait photo is limited by its height", async () => {
  mockSize = { width: 3000, height: 4000 };
  await shrink("file:///p.jpg", "image/jpeg", MAX_EDGE.cover);
  expect(mockResize).toHaveBeenCalledWith({ height: 1280 });
});

test("a photo already smaller than the limit is only re-saved, never scaled up", async () => {
  mockSize = { width: 200, height: 150 };
  const r = await shrink("file:///tiny.png", "image/png", MAX_EDGE.avatar);
  expect(mockResize).not.toHaveBeenCalled();
  expect(r.mimeType).toBe("image/webp");
});

test("if the photo cannot be shrunk, the original is returned so the upload still happens", async () => {
  mockFail = true;
  expect(await shrink("file:///x.png", "image/png", MAX_EDGE.photo)).toEqual({ uri: "file:///x.png", mimeType: "image/png" });
});

test("the limits match what the app shows", () => {
  expect(MAX_EDGE).toEqual({ avatar: 256, cover: 1280, photo: 1600 });
});
