import { deleteMyAccount, uploadAvatar } from "./profile";

const mockRpc = jest.fn();
const mockUpload = jest.fn();
const mockFetch = jest.fn();
jest.mock("./supabase", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    rpc: (...a: unknown[]) => mockRpc(...a),
    storage: { from: () => ({ upload: (...a: unknown[]) => mockUpload(...a) }) },
  },
}));
beforeEach(() => { jest.clearAllMocks(); globalThis.fetch = mockFetch as never; mockFetch.mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(8) }); });

test("US-02 the picture goes into my own folder and is then set as mine", async () => {
  mockUpload.mockResolvedValue({ error: null });
  mockRpc.mockResolvedValue({ error: null });
  expect(await uploadAvatar("file:///me.jpg", "image/jpeg")).toEqual({ ok: true });
  const path = mockUpload.mock.calls[0][0] as string;
  expect(path).toMatch(/^u1\/\d+\.jpg$/);
  expect(mockRpc).toHaveBeenCalledWith("set_my_avatar", { p_path: path });
});

test("US-02 an unsupported file is refused before upload, and a failed upload sets nothing", async () => {
  expect((await uploadAvatar("file:///x.gif", "image/gif")).ok).toBe(false);
  expect(mockUpload).not.toHaveBeenCalled();
  mockUpload.mockResolvedValue({ error: { message: "boom" } });
  expect(await uploadAvatar("file:///me.jpg", "image/jpeg")).toEqual({ ok: false, message: "Couldn't upload the photo. Try again." });
  expect(mockRpc).not.toHaveBeenCalled();
});

test("US-02 deleting the account also removes my profile picture files, and a refused deletion removes nothing", async () => {
  const mockList = jest.fn().mockResolvedValue({ data: [{ name: "1.jpg" }, { name: "2.png" }] });
  const mockRemove = jest.fn().mockResolvedValue({ error: null });
  const api = jest.requireMock("./supabase").supabase;
  api.storage.from = () => ({ upload: (...a: unknown[]) => mockUpload(...a), list: mockList, remove: mockRemove });
  api.auth.signOut = jest.fn().mockResolvedValue({});
  mockRpc.mockResolvedValueOnce({ error: { message: "owns_open_trips" } });
  expect((await deleteMyAccount()).ok).toBe(false);
  expect(mockRemove).not.toHaveBeenCalled();
  mockRpc.mockResolvedValueOnce({ error: null });
  expect(await deleteMyAccount()).toEqual({ ok: true });
  expect(mockList).toHaveBeenCalledWith("u1");
  expect(mockRemove).toHaveBeenCalledWith(["u1/1.jpg", "u1/2.png"]);
});

test("US-02 removing my picture detaches it from the account first, then deletes the files, and a refusal removes nothing", async () => {
  const api = jest.requireMock("./supabase").supabase;
  const mockList = jest.fn().mockResolvedValue({ data: [{ name: "1.jpg" }] });
  const mockRemove = jest.fn().mockResolvedValue({ error: null });
  api.storage.from = () => ({ list: mockList, remove: mockRemove });
  const { removeAvatar } = jest.requireActual("./profile");
  mockRpc.mockResolvedValueOnce({ error: { message: "boom" } });
  expect((await removeAvatar()).ok).toBe(false);
  expect(mockRemove).not.toHaveBeenCalled();
  mockRpc.mockResolvedValueOnce({ error: null });
  expect(await removeAvatar()).toEqual({ ok: true });
  expect(mockRpc).toHaveBeenLastCalledWith("set_my_avatar", { p_path: null });
  expect(mockRemove).toHaveBeenCalledWith(["u1/1.jpg"]);
});
