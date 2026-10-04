import { addGuest, addMemberByEmail, removeGuest } from "./members";

const mockRpc = jest.fn();
jest.mock("./supabase", () => ({ supabase: { rpc: (...a: unknown[]) => mockRpc(...a) } }));
beforeEach(() => mockRpc.mockReset());

test("US-02 adds a guest by name through the RPC", async () => {
  mockRpc.mockResolvedValue({ error: null });
  expect(await addGuest("t1", "Rahul")).toEqual({ ok: true });
  expect(mockRpc).toHaveBeenCalledWith("add_guest_member", { p_trip: "t1", p_display_name: "Rahul" });
});

test("US-02 a non-owner gets a specific message", async () => {
  mockRpc.mockResolvedValue({ error: { code: "42501", message: "x" } });
  expect(await addGuest("t1", "Rahul")).toEqual({ ok: false, message: "Only the trip owner can add guests." });
});

test("US-02 adding by email returns the person's name, and each refusal is explained in plain words", async () => {
  mockRpc.mockResolvedValueOnce({ data: "Ben", error: null });
  expect(await addMemberByEmail("t1", "ben@example.com")).toEqual({ ok: true, name: "Ben" });
  expect(mockRpc).toHaveBeenCalledWith("add_member_by_email", { p_trip: "t1", p_email: "ben@example.com" });
  mockRpc.mockResolvedValueOnce({ error: { message: "user_not_found", code: "P0001" } });
  expect(await addMemberByEmail("t1", "x@example.com")).toMatchObject({ ok: false, message: expect.stringContaining("No one on along uses that email") });
  mockRpc.mockResolvedValueOnce({ error: { message: "already_member", code: "P0001" } });
  expect(await addMemberByEmail("t1", "ben@example.com")).toEqual({ ok: false, message: "They're already on this trip." });
  mockRpc.mockResolvedValueOnce({ error: { message: "only the owner", code: "42501" } });
  expect(await addMemberByEmail("t1", "ben@example.com")).toEqual({ ok: false, message: "Only the trip owner can add people." });
});

test("US-03 deleting a guest calls remove_member, and a joined member is refused with a plain reason", async () => {
  mockRpc.mockResolvedValueOnce({ error: null });
  expect(await removeGuest("g1")).toEqual({ ok: true });
  expect(mockRpc).toHaveBeenCalledWith("remove_member", { p_member: "g1" });
  mockRpc.mockResolvedValueOnce({ error: { message: "only_guests_can_be_removed", code: "P0001" } });
  expect(await removeGuest("b1")).toEqual({ ok: false, message: "Only guests who haven't joined can be deleted." });
  mockRpc.mockResolvedValueOnce({ error: { message: "x", code: "42501" } });
  expect(await removeGuest("g1")).toEqual({ ok: false, message: "Only the trip owner can delete guests." });
});
