import { isSearchable, toFoundPlace } from "./places";

test("a Nominatim result becomes a name, a short where-line and coordinates", () => {
  const p = toFoundPlace({ place_id: 1, name: "Baga Beach", display_name: "Baga Beach, Baga, Bardez, North Goa, Goa, 403516, India", lat: "15.5566", lon: "73.7517" });
  expect(p).toEqual({ id: "1", title: "Baga Beach", subtitle: "Baga, Goa, India", lat: 15.5566, lng: 73.7517 });
});

test("a short result keeps all of its where-line, and a missing name falls back to the first part", () => {
  expect(toFoundPlace({ place_id: 2, display_name: "Goa, India", lat: "15.3", lon: "74.1" })).toMatchObject({ title: "Goa", subtitle: "India" });
});

test("a result with no usable coordinates or name is dropped", () => {
  expect(toFoundPlace({ display_name: "Nowhere", lat: "x", lon: "1" })).toBeNull();
  expect(toFoundPlace({ lat: "1", lon: "1" })).toBeNull();
});

test("only real words are searched: three or more characters, and never a link", () => {
  expect(isSearchable("Go")).toBe(false);
  expect(isSearchable("  Goa ")).toBe(true);
  expect(isSearchable("https://maps.app.goo.gl/abc")).toBe(false);
  expect(isSearchable("https://www.google.com/maps/place/Goa/@15.29,74.12,9z")).toBe(false);
});
