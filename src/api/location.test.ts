import { resolveLocation } from "./location";

const mockInvoke = jest.fn();
jest.mock("./supabase", () => ({ supabase: { functions: { invoke: (...a: unknown[]) => mockInvoke(...a) } } }));
const mockFetch = jest.fn();
beforeEach(() => { mockInvoke.mockReset(); mockFetch.mockReset().mockRejectedValue(new Error("offline")); globalThis.fetch = mockFetch as never; });

test("3.3 with no Edge Function, the phone follows the short link itself and reads the final address", async () => {
  mockInvoke.mockRejectedValue(new Error("no function"));
  mockFetch.mockResolvedValue({ url: "https://www.google.com/maps/place/Baga+Beach/@15.5566,73.7517,15z" });
  const r = await resolveLocation("https://maps.app.goo.gl/abc");
  expect(r.place).toEqual({ lat: 15.5566, lng: 73.7517, name: "Baga Beach" });
  expect(r.url).toBe("https://maps.app.goo.gl/abc");
});

test("3.3 a full Maps link resolves without any network call", async () => {
  const r = await resolveLocation("https://www.google.com/maps/place/Goa/@15.29,74.12,9z");
  expect(r.place).toEqual({ lat: 15.29, lng: 74.12, name: "Goa" });
  expect(mockInvoke).not.toHaveBeenCalled();
});

test("3.3 a short link is expanded by the Edge Function, then read", async () => {
  mockInvoke.mockResolvedValue({ data: { final_url: "https://www.google.com/maps/place/Goa/@15.29,74.12,9z" }, error: null });
  const r = await resolveLocation("https://maps.app.goo.gl/abc");
  expect(mockInvoke).toHaveBeenCalledWith("resolve-location-link", { body: { url: "https://maps.app.goo.gl/abc" } });
  expect(r).toEqual({ text: "https://maps.app.goo.gl/abc", url: "https://maps.app.goo.gl/abc", place: { lat: 15.29, lng: 74.12, name: "Goa" } });
});

test("3.3 a short link that will not expand is kept as typed, not rejected", async () => {
  mockInvoke.mockResolvedValue({ data: null, error: { message: "boom" } });
  expect(await resolveLocation("https://maps.app.goo.gl/abc")).toEqual({ text: "https://maps.app.goo.gl/abc", url: "https://maps.app.goo.gl/abc", place: null });
  mockInvoke.mockRejectedValue(new Error("offline"));
  expect((await resolveLocation("https://maps.app.goo.gl/abc")).place).toBeNull();
});

test("3.3 plain text is returned as typed", async () => {
  expect(await resolveLocation("  Fish Curry Place  ")).toEqual({ text: "Fish Curry Place", url: null, place: null });
});
