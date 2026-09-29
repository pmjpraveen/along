import { createSettlement } from "./settlements";

const mockRpc = jest.fn();
jest.mock("./supabase", () => ({ supabase: { rpc: (...a: unknown[]) => mockRpc(...a) } }));
beforeEach(() => mockRpc.mockReset());
const input = { tripId: "t1", fromMemberId: "b", toMemberId: "a", amountMinor: 30000, key: "k1" };

test("5.5 sends payer, receiver, minor-unit amount and the idempotency key, never the overpayment flag", async () => {
  mockRpc.mockResolvedValue({ error: null });
  expect(await createSettlement(input)).toEqual({ ok: true });
  expect(mockRpc).toHaveBeenCalledWith("create_settlement", { p_trip: "t1", p_from: "b", p_to: "a", p_amount_minor: 30000, p_idempotency_key: "k1" });
});

test("5.5 an overpayment and a non-party get specific messages", async () => {
  mockRpc.mockResolvedValue({ error: { message: "exceeds_outstanding_debt" } });
  expect(await createSettlement(input)).toEqual({ ok: false, message: "That's more than is still owed. Enter a smaller amount." });
  mockRpc.mockResolvedValue({ error: { code: "42501", message: "x" } });
  const r = await createSettlement(input);
  expect(r.ok === false && r.message).toMatch(/person paying/);
});

test("5.5 a network failure says offline", async () => {
  mockRpc.mockRejectedValue(new Error("Network request failed"));
  const r = await createSettlement(input);
  expect(r.ok === false && r.message).toMatch(/No connection/);
});
