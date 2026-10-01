import { addNote, addPhoto, listMemories } from "./memories";

const mockRpc = jest.fn();
const mockUpload = jest.fn();
const mockSigned = jest.fn();
const mockFrom = jest.fn();
jest.mock("./supabase", () => ({
  supabase: {
    rpc: (...a: unknown[]) => mockRpc(...a), from: (...a: unknown[]) => mockFrom(...a),
    storage: { from: () => ({ upload: (...a: unknown[]) => mockUpload(...a), createSignedUrls: (...a: unknown[]) => mockSigned(...a) }) },
  },
}));
const mockFetch = jest.fn();
(globalThis as unknown as { fetch: unknown }).fetch = (...a: unknown[]) => mockFetch(...a);
beforeEach(() => { jest.clearAllMocks(); mockFetch.mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(8) }); });

const table = (rows: unknown[], error: { message: string } | null = null) => {
  const q: any = { select: () => q, eq: () => q, is: () => q, order: () => q, then: (r: (v: unknown) => void) => r({ data: rows, error }) };
  return q;
};

test("7.3 a note is saved through the server function with its idempotency key", async () => {
  mockRpc.mockResolvedValue({ error: null });
  expect(await addNote("t1", "The sunset", "k1")).toEqual({ ok: true });
  expect(mockRpc).toHaveBeenCalledWith("add_memory", { p_trip: "t1", p_type: "note", p_idempotency_key: "k1", p_body: "The sunset" });
});

test("7.3 a photo goes into the trip's folder under a path built from its key, then is recorded", async () => {
  mockUpload.mockResolvedValue({ error: null });
  mockRpc.mockResolvedValue({ error: null });
  expect(await addPhoto("t1", "file:///beach.jpg", "image/jpeg", "k2", "Beach")).toEqual({ ok: true });
  expect(mockUpload).toHaveBeenCalledWith("t1/k2.jpg", expect.any(ArrayBuffer), { contentType: "image/jpeg", upsert: true });
  expect(mockRpc).toHaveBeenCalledWith("add_memory", { p_trip: "t1", p_type: "photo", p_idempotency_key: "k2", p_media_path: "t1/k2.jpg", p_caption: "Beach" });
});

test("7.3 a failed upload records nothing, and a retry reuses the same path", async () => {
  mockUpload.mockResolvedValueOnce({ error: { message: "Network request failed" } }).mockResolvedValueOnce({ error: null });
  mockRpc.mockResolvedValue({ error: null });
  const first = await addPhoto("t1", "file:///beach.jpg", "image/jpeg", "k2");
  expect(first.ok === false && first.message).toMatch(/You're offline/);
  expect(mockRpc).not.toHaveBeenCalled();
  expect(await addPhoto("t1", "file:///beach.jpg", "image/jpeg", "k2")).toEqual({ ok: true });
  expect(mockUpload.mock.calls[0][0]).toBe(mockUpload.mock.calls[1][0]);
});

test("7.3 an unsupported file type is refused before anything is sent", async () => {
  const r = await addPhoto("t1", "file:///clip.gif", "image/gif", "k3");
  expect(r.ok).toBe(false);
  expect(mockUpload).not.toHaveBeenCalled();
});

test("7.3 the list shows notes and photos newest first with author names and signed photo links", async () => {
  mockFrom.mockImplementation((t: string) => (t === "memories"
    ? table([
        { id: "m2", type: "photo", media_path: "t1/k2.jpg", caption: "Beach", body: null, place_name: null, created_at: "2026-12-06T10:00:00Z", created_by_member_id: "a" },
        { id: "m1", type: "note", media_path: null, caption: null, body: "The sunset", place_name: null, created_at: "2026-12-06T09:00:00Z", created_by_member_id: "b" },
      ])
    : table([{ id: "a", display_name: "Asha" }, { id: "b", display_name: "Ben" }])));
  mockSigned.mockResolvedValue({ data: [{ path: "t1/k2.jpg", signedUrl: "https://signed/k2" }] });
  const r = await listMemories("t1");
  expect(r.ok && r.memories.map((m) => [m.id, m.author, m.photoUrl])).toEqual([["m2", "Asha", "https://signed/k2"], ["m1", "Ben", null]]);
});

test("7.3 a failed load returns a message", async () => {
  mockFrom.mockImplementation(() => table([], { message: "boom" }));
  expect(await listMemories("t1")).toEqual({ ok: false, message: "Couldn't load memories. Try again." });
});
