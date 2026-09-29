import { addGuest } from "./members";

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
