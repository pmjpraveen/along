import { googlePhotosUrl, parseLinkPreview } from "./googlePhotos";

test("US-27 a Google Photos share link is accepted, with https added and surrounding text ignored", () => {
  expect(googlePhotosUrl("https://photos.app.goo.gl/AbC123xyz")).toBe("https://photos.app.goo.gl/AbC123xyz");
  expect(googlePhotosUrl("  photos.app.goo.gl/AbC123xyz  ")).toBe("https://photos.app.goo.gl/AbC123xyz");
  expect(googlePhotosUrl("http://photos.google.com/share/AF1Q?key=abc")).toBe("https://photos.google.com/share/AF1Q?key=abc");
  expect(googlePhotosUrl("Our Goa album 🌴 https://photos.app.goo.gl/AbC123xyz thanks!")).toBe("https://photos.app.goo.gl/AbC123xyz");
});

test("US-27 anything that is not a Google Photos link is refused", () => {
  for (const bad of ["", "hello", "https://example.com/album", "https://photos.google.com", "https://evil.com/photos.app.goo.gl/x", "javascript:alert(1)", "https://photos.app.goo.gl.evil.com/x"])
    expect(googlePhotosUrl(bad)).toBeNull();
});

test("US-27 the preview comes from the page's Open Graph tags, whichever order the attributes are in", () => {
  const html = `<head><meta content="Goa 2026 &amp; friends" property="og:title"><meta property="og:image" content="https://lh3.googleusercontent.com/abc=w1200"></head>`;
  expect(parseLinkPreview(html)).toEqual({ title: "Goa 2026 & friends", image: "https://lh3.googleusercontent.com/abc=w1200" });
});

test("US-27 a missing or unsafe preview comes back as nulls instead of an error", () => {
  expect(parseLinkPreview("<html></html>")).toEqual({ title: null, image: null });
  expect(parseLinkPreview(`<meta property="og:image" content="http://insecure.example/x.jpg"><meta property="og:title" content="">`)).toEqual({ title: null, image: null });
  expect(parseLinkPreview(`<meta name='og:title' content='It&#39;s Goa'>`)).toEqual({ title: "It's Goa", image: null });
});
