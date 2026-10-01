import { completeTrip, createTrip, deleteTrip, listTrips, loadTripStatus, uploadCover } from "./trips";

const mockRpc = jest.fn();
const mockUpload = jest.fn();
const mockSigned = jest.fn();
const mockFrom = jest.fn();
const mockList = jest.fn();
const mockRemove = jest.fn();
jest.mock("./supabase", () => ({
  supabase: {
    rpc: (...a: unknown[]) => mockRpc(...a), from: (...a: unknown[]) => mockFrom(...a),
    storage: { from: () => ({ upload: (...a: unknown[]) => mockUpload(...a), createSignedUrls: (...a: unknown[]) => mockSigned(...a), list: (...a: unknown[]) => mockList(...a), remove: (...a: unknown[]) => mockRemove(...a) }) },
  },
}));
const mockFetch = jest.fn();
(globalThis as unknown as { fetch: unknown }).fetch = (...a: unknown[]) => mockFetch(...a);
const d = { name: "Goa", destination: "Goa, India", start: "2026-12-01", end: "2026-12-05" };
beforeEach(() => mockRpc.mockReset());

test("US-01 sends the idempotency key and returns the trip id", async () => {
  mockRpc.mockResolvedValue({ data: { id: "t1" }, error: null });
  expect(await createTrip(d, "INR", "key-1")).toEqual({ ok: true, tripId: "t1" });
  expect(mockRpc).toHaveBeenCalledWith("create_trip", expect.objectContaining({ p_idempotency_key: "key-1", p_currency: "INR" }));
});

test("US-01 a failed create returns a specific message", async () => {
  mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });
  expect(await createTrip(d, "INR", "k")).toEqual({ ok: false, message: "Couldn't create the trip. Try again." });
});

test("US-01 a network failure says offline", async () => {
  mockRpc.mockRejectedValue(new Error("Network request failed"));
  expect((await createTrip(d, "INR", "k")).ok).toBe(false);
});

test("7.1 completing a trip calls the server and reports owner-only rejections clearly", async () => {
  mockRpc.mockResolvedValue({ error: null });
  expect(await completeTrip("t1")).toEqual({ ok: true });
  expect(mockRpc).toHaveBeenCalledWith("complete_trip", { p_trip: "t1" });
  mockRpc.mockResolvedValue({ error: { code: "42501", message: "x" } });
  expect(await completeTrip("t1")).toEqual({ ok: false, message: "Only the trip owner can complete this trip." });
  mockRpc.mockRejectedValue(new Error("Network request failed"));
  expect(await completeTrip("t1")).toEqual({ ok: false, message: "You're offline. Check your connection and try again." });
});

const rows = (data: unknown, error: { message: string } | null = null) => {
  const q: any = { select: () => q, order: () => q, eq: () => q, single: async () => ({ data, error }), then: (r: (v: unknown) => void) => r({ data, error }) };
  return q;
};

test("cover: stored covers are signed for display and plain https covers are used as they are", async () => {
  mockFrom.mockReturnValue(rows([
    { id: "t1", name: "Goa", destination_name: "Goa", start_date: "2026-01-01", end_date: "2026-01-02", phase: "active", cover_url: "t1/c.jpg" },
    { id: "t2", name: "Ooty", destination_name: "Ooty", start_date: "2026-01-01", end_date: "2026-01-02", phase: "active", cover_url: "https://picsum.photos/x" },
    { id: "t3", name: "Bare", destination_name: "Bare", start_date: "2026-01-01", end_date: "2026-01-02", phase: "active", cover_url: null },
  ]));
  mockSigned.mockResolvedValue({ data: [{ path: "t1/c.jpg", signedUrl: "https://signed/c" }] });
  const r = await listTrips();
  expect(r.ok && r.trips.map((t) => t.coverUrl)).toEqual(["https://signed/c", "https://picsum.photos/x", null]);
  expect(mockSigned).toHaveBeenCalledWith(["t1/c.jpg"], 3600);
});

test("cover: a trip's status carries its destination, signed cover and chosen card colour for the header", async () => {
  mockFrom.mockReturnValue(rows({ status: "published", completed_at: null, name: "Goa", destination_name: "Goa, India", cover_url: "t1/c.jpg", card_color: 2 }));
  mockSigned.mockResolvedValue({ data: [{ path: "t1/c.jpg", signedUrl: "https://signed/c" }] });
  expect(await loadTripStatus("t1")).toEqual({ ok: true, status: "published", completedAt: null, name: "Goa", destination: "Goa, India", coverUrl: "https://signed/c", cardColor: 2 });
});

test("cover: a photo is uploaded into the trip's folder, then made the cover", async () => {
  mockFetch.mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(8) });
  mockUpload.mockResolvedValue({ error: null });
  mockRpc.mockResolvedValue({ error: null });
  expect(await uploadCover("t1", "file:///goa.jpg", "image/jpeg")).toEqual({ ok: true });
  const path = mockUpload.mock.calls[0][0] as string;
  expect(path).toMatch(/^t1\/\d+\.jpg$/);
  expect(mockRpc).toHaveBeenCalledWith("set_trip_cover", { p_trip: "t1", p_path: path });
});

test("cover: a non-owner is told so, an unsupported file is refused before upload, and nothing is set after a failed upload", async () => {
  mockFetch.mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(8) });
  mockUpload.mockResolvedValue({ error: { message: "new row violates row-level security policy" } });
  expect(await uploadCover("t1", "file:///goa.jpg", "image/jpeg")).toEqual({ ok: false, message: "Only the trip owner can change the cover." });
  expect(mockRpc).not.toHaveBeenCalled();
  mockUpload.mockClear();
  expect((await uploadCover("t1", "file:///x.gif", "image/gif")).ok).toBe(false);
  expect(mockUpload).not.toHaveBeenCalled();
});

test("deleting a trip removes its cover and memory photos, then erases the trip", async () => {
  mockList.mockResolvedValueOnce({ data: [{ name: "1.jpg" }] }).mockResolvedValueOnce({ data: [{ name: "a.png" }, { name: "b.png" }] });
  mockRemove.mockResolvedValue({ error: null });
  mockRpc.mockResolvedValue({ error: null });
  expect(await deleteTrip("t1")).toEqual({ ok: true });
  expect(mockRemove).toHaveBeenNthCalledWith(1, ["t1/1.jpg"]);
  expect(mockRemove).toHaveBeenNthCalledWith(2, ["t1/a.png", "t1/b.png"]);
  expect(mockRpc).toHaveBeenCalledWith("delete_trip", { p_trip: "t1" });
});

test("a failed photo clean-up never blocks erasing the trip, and a refusal for a non-owner is explained", async () => {
  mockList.mockRejectedValue(new Error("boom"));
  mockRpc.mockResolvedValue({ error: { message: "x", code: "42501" } });
  expect(await deleteTrip("t1")).toEqual({ ok: false, message: "Only the trip owner can delete the trip." });
  expect(mockRpc).toHaveBeenCalled();
});
