import { addGuest, addMemberByEmail } from "./members";

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
