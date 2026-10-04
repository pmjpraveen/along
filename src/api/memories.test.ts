import { addLink, addNote, addPhoto, deleteMemory, listMemories, previewLink, updateNote } from "./memories";

const mockRpc = jest.fn();
const mockUpload = jest.fn();
const mockSigned = jest.fn();
const mockFrom = jest.fn();
jest.mock("./supabase", () => ({
  supabase: {
    rpc: (...a: unknown[]) => mockRpc(...a), from: (...a: unknown[]) => mockFrom(...a),
    auth: { getSession: async () => ({ data: { session: { user: { id: "u1" } } } }) },
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
    : table([{ id: "a", user_id: "u0", role: "owner", display_name: "Asha" }, { id: "b", user_id: "u1", role: "member", display_name: "Ben" }])));
  mockSigned.mockResolvedValue({ data: [{ path: "t1/k2.jpg", signedUrl: "https://signed/k2" }] });
  const r = await listMemories("t1");
  expect(r.ok && r.memories.map((m) => [m.id, m.author, m.photoUrl])).toEqual([["m2", "Asha", "https://signed/k2"], ["m1", "Ben", null]]);
  // I am Ben (u1): I can manage my own note but not Asha's photo.
  expect(r.ok && r.memories.map((m) => m.canManage)).toEqual([false, true]);
});

test("7.3 a failed load returns a message", async () => {
  mockFrom.mockImplementation(() => table([], { message: "boom" }));
  expect(await listMemories("t1")).toEqual({ ok: false, message: "Couldn't load memories. Try again." });
});

test("US-27 a link is saved with the title and picture read when it was added, under a key", async () => {
  mockRpc.mockResolvedValue({ error: null });
  expect(await addLink("t1", "https://photos.app.goo.gl/AbC", "k9", { title: "Goa", image: "https://lh3.googleusercontent.com/x" })).toEqual({ ok: true });
  expect(mockRpc).toHaveBeenCalledWith("add_memory", { p_trip: "t1", p_type: "link", p_idempotency_key: "k9", p_link_url: "https://photos.app.goo.gl/AbC", p_link_title: "Goa", p_link_image_url: "https://lh3.googleusercontent.com/x" });
  mockRpc.mockResolvedValueOnce({ error: { message: "network" } });
  expect((await addLink("t1", "https://photos.app.goo.gl/AbC", "k9", { title: null, image: null })).ok).toBe(false);
});

test("US-27 the preview is read from the page, and any failure just means no preview", async () => {
  mockFetch.mockResolvedValueOnce({ ok: true, text: async () => `<meta property="og:title" content="Goa 2026"><meta property="og:image" content="https://lh3.googleusercontent.com/x">` });
  expect(await previewLink("https://photos.app.goo.gl/AbC")).toEqual({ title: "Goa 2026", image: "https://lh3.googleusercontent.com/x" });
  mockFetch.mockResolvedValueOnce({ ok: false, text: async () => "" });
  expect(await previewLink("https://photos.app.goo.gl/AbC")).toEqual({ title: null, image: null });
  mockFetch.mockRejectedValueOnce(new Error("offline"));
  expect(await previewLink("https://photos.app.goo.gl/AbC")).toEqual({ title: null, image: null });
});

test("US-27 deleting calls delete_memory, treats an already-deleted one as done, and explains a refusal", async () => {
  mockRpc.mockResolvedValueOnce({ error: null });
  expect(await deleteMemory("m1")).toEqual({ ok: true });
  expect(mockRpc).toHaveBeenCalledWith("delete_memory", { p_memory: "m1" });
  mockRpc.mockResolvedValueOnce({ error: { message: "memory not found", code: "P0002" } });
  expect(await deleteMemory("m1")).toEqual({ ok: true });
  mockRpc.mockResolvedValueOnce({ error: { message: "x", code: "42501" } });
  expect(await deleteMemory("m1")).toEqual({ ok: false, message: "Only the person who added this or the trip owner can delete it." });
});

test("US-27 editing a note calls update_memory_note and explains an empty or refused edit", async () => {
  mockRpc.mockResolvedValueOnce({ error: null });
  expect(await updateNote("m1", "New text")).toEqual({ ok: true });
  expect(mockRpc).toHaveBeenCalledWith("update_memory_note", { p_memory: "m1", p_body: "New text" });
  mockRpc.mockResolvedValueOnce({ error: { message: "x", code: "22023" } });
  expect((await updateNote("m1", " ")).ok).toBe(false);
  mockRpc.mockResolvedValueOnce({ error: { message: "x", code: "42501" } });
  expect(await updateNote("m1", "x")).toEqual({ ok: false, message: "Only the person who added this or the trip owner can edit it." });
});
