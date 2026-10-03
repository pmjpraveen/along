import { isMapsUrl, isShortLink, OSM_ZOOM, parseMapsUrl, TILE, tilesFor } from "./maps";

const cases: [string, string, { lat: number; lng: number; name: string | null }][] = [
  ["place link with pin", "https://www.google.com/maps/place/Fish+Curry+Place/@15.4989,73.8278,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x1!8m2!3d15.5001!4d73.8003",
    { lat: 15.5001, lng: 73.8003, name: "Fish Curry Place" }],
  ["place link, viewport only", "https://www.google.com/maps/place/Taj+Mahal/@27.1751,78.0421,17z", { lat: 27.1751, lng: 78.0421, name: "Taj Mahal" }],
  ["coordinates in the path", "https://www.google.com/maps/@15.4989,-73.8278,15z", { lat: 15.4989, lng: -73.8278, name: null }],
  ["q= coordinates", "https://maps.google.com/?q=15.5,73.8", { lat: 15.5, lng: 73.8, name: null }],
  ["search api query coordinates", "https://www.google.com/maps/search/?api=1&query=15.5,73.8", { lat: 15.5, lng: 73.8, name: null }],
  ["encoded place name", "https://www.google.com/maps/place/Caf%C3%A9+Del+Mar/@38.7,-9.1,17z", { lat: 38.7, lng: -9.1, name: "Café Del Mar" }],
  ["regional domain", "https://www.google.co.in/maps/place/Goa/@15.29,74.12,9z", { lat: 15.29, lng: 74.12, name: "Goa" }],
  ["southern/western hemisphere", "https://www.google.com/maps/@-33.8688,151.2093,12z", { lat: -33.8688, lng: 151.2093, name: null }],
];

test.each(cases)("3.3 resolves %s", (_n, url, want) => {
  expect(isMapsUrl(url)).toBe(true);
  expect(parseMapsUrl(url)).toEqual(want);
});

test("3.3 short links are recognized but carry no place until expanded", () => {
  expect(isMapsUrl("https://maps.app.goo.gl/AbC123")).toBe(true);
  expect(isShortLink("https://maps.app.goo.gl/AbC123")).toBe(true);
  expect(isShortLink("https://goo.gl/maps/xyz")).toBe(true);
  expect(parseMapsUrl("https://maps.app.goo.gl/AbC123")).toBeNull();
});

test("3.3 plain text and other sites are not Maps links", () => {
  for (const t of ["Fish Curry Place, Goa", "", "https://example.com/maps/place/x", "https://www.google.com/search?q=maps", "not a url @1,2"]) {
    expect(isMapsUrl(t)).toBe(false);
    expect(parseMapsUrl(t)).toBeNull();
  }
});

test("3.3 out-of-range coordinates are not accepted", () => {
  expect(parseMapsUrl("https://www.google.com/maps/@95.0,10.0,15z")).toBeNull();
});

test("an Apple Maps link is a maps link, and its coordinate and name are read", () => {
  const url = "https://maps.apple.com/place?address=Puri,%20Odisha,%20India&auid=17674427537618280153&coordinate=19.813312,85.831257&lsp=6489&name=Puri&map=explore";
  expect(isMapsUrl(url)).toBe(true);
  expect(parseMapsUrl(url)).toEqual({ lat: 19.813312, lng: 85.831257, name: "Puri" });
  expect(parseMapsUrl("https://maps.apple.com/?q=Somewhere")).toBeNull();
});

describe("OpenStreetMap tiles", () => {
  const goa = { lat: 15.5559, lng: 73.7517 };

  test("US-03 the place sits at the exact centre of the box, whichever tile it falls in", () => {
    for (const [w, h] of [[360, 96], [300, 140], [411, 96]]) {
      const tiles = tilesFor(goa, w, h);
      const n = 2 ** OSM_ZOOM;
      const px = ((goa.lng + 180) / 360) * n * 256;
      const holder = tiles.find((t) => t.left <= w / 2 && w / 2 < t.left + TILE && t.top <= h / 2 && h / 2 < t.top + TILE)!;
      expect(holder).toBeTruthy();
      expect(holder.uri).toContain(`/${OSM_ZOOM}/${Math.floor(px / 256)}/`);
    }
  });

  test("US-03 the tiles cover the whole box with no gaps", () => {
    for (const [lat, lng] of [[15.5559, 73.7517], [0, 0], [-33.8, 151.2], [60.2, 24.9], [35.0116, 135.7681]]) {
      const [w, h] = [393, 96];
      const tiles = tilesFor({ lat, lng }, w, h);
      for (let x = 0; x < w; x += 8) for (let y = 0; y < h; y += 8) {
        expect(tiles.some((t) => x >= t.left && x < t.left + TILE && y >= t.top && y < t.top + TILE)).toBe(true);
      }
    }
  });

  test("US-03 known tile addresses: the origin at zoom 1 and Kyoto at zoom 17", () => {
    expect(tilesFor({ lat: 0, lng: 0 }, 2, 2, 1).some((t) => t.uri.endsWith("/1/1/1.png"))).toBe(true);
    expect(tilesFor({ lat: 35.0116, lng: 135.7681 }, 2, 2).map((t) => t.uri)).toContain("https://tile.openstreetmap.org/17/114967/51912.png");
  });

  test("US-03 near the date line the tile column wraps instead of leaving the map", () => {
    const uris = tilesFor({ lat: 0, lng: 179.9999 }, 600, 96).map((t) => Number(t.uri.split("/")[4]));
    expect(Math.max(...uris)).toBeLessThan(2 ** OSM_ZOOM);
  });

  test("US-03 a pole latitude is clamped so every tile row exists", () => {
    expect(tilesFor({ lat: 90, lng: 0 }, 300, 96).length).toBeGreaterThan(0);
  });
});
