import { isMapsUrl, isShortLink, parseMapsUrl } from "./maps";

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
