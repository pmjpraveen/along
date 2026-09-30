import { searchPlaces } from "./placeSearch";

const mockFetch = jest.fn();
beforeEach(() => { mockFetch.mockReset(); globalThis.fetch = mockFetch as never; });

test("a search asks Nominatim for at most six matches, encodes the words and reads the places", async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => [{ place_id: 1, display_name: "Goa, India", lat: "15.3", lon: "74.1" }, { place_id: 1, display_name: "Goa, India", lat: "15.3", lon: "74.1" }] });
  const r = await searchPlaces("Goa beach");
  expect(String(mockFetch.mock.calls[0][0])).toContain("q=Goa%20beach");
  expect(String(mockFetch.mock.calls[0][0])).toContain("limit=6");
  expect(mockFetch.mock.calls[0][1].headers["User-Agent"]).toMatch(/along/);
  expect(r).toEqual({ ok: true, places: [expect.objectContaining({ title: "Goa", lat: 15.3 })] });
});

test("a rate limit, a server error and no connection each say something specific, and a cancelled search is quiet", async () => {
  mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
  expect(await searchPlaces("Goa")).toEqual({ ok: false, message: expect.stringMatching(/Too many searches/) });
  mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
  expect(await searchPlaces("Goa")).toEqual({ ok: false, message: expect.stringMatching(/Couldn't search/) });
  mockFetch.mockRejectedValueOnce(new Error("offline"));
  expect(await searchPlaces("Goa")).toEqual({ ok: false, message: expect.stringMatching(/No connection/) });
  mockFetch.mockRejectedValueOnce(Object.assign(new Error("x"), { name: "AbortError" }));
  expect(await searchPlaces("Goa")).toEqual({ ok: true, places: [] });
});
