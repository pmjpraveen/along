import { completeTrip, createTrip } from "./trips";

const mockRpc = jest.fn();
jest.mock("./supabase", () => ({ supabase: { rpc: (...a: unknown[]) => mockRpc(...a) } }));
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
  expect(await completeTrip("t1")).toEqual({ ok: false, message: "No connection. Check your internet and try again." });
});
