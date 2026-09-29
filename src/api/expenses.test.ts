import { createExpense } from "./expenses";

const mockRpc = jest.fn();
jest.mock("./supabase", () => ({ supabase: { rpc: (...a: unknown[]) => mockRpc(...a) } }));
beforeEach(() => mockRpc.mockReset());
const input = { tripId: "t1", title: "Lunch", amountMinor: 1000, date: "2026-12-02", key: "k1", split: [{ memberId: "a", owedMinor: 500 }, { memberId: "b", owedMinor: 500 }] };

test("US-05 sends amount in minor units, the split and the idempotency key; no payer means the server defaults to me", async () => {
  mockRpc.mockResolvedValue({ error: null });
  expect(await createExpense(input)).toEqual({ ok: true });
  expect(mockRpc).toHaveBeenCalledWith("create_expense", {
    p_trip: "t1", p_title: "Lunch", p_amount_minor: 1000, p_expense_date: "2026-12-02", p_idempotency_key: "k1",
    p_split: [{ member_id: "a", owed_minor: 500 }, { member_id: "b", owed_minor: 500 }],
  });
});

test("US-05 a failed save returns a specific message", async () => {
  mockRpc.mockResolvedValue({ error: { message: "boom" } });
  expect(await createExpense(input)).toEqual({ ok: false, message: "Couldn't save the expense. Try again." });
  mockRpc.mockRejectedValue(new Error("Network request failed"));
  expect((await createExpense(input)).ok).toBe(false);
});
