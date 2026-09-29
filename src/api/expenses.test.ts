import { createExpense, updateExpense } from "./expenses";

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
  mockRpc.mockResolvedValue({ error: { message: "boom" }, status: 400 });
  expect(await createExpense(input)).toEqual({ ok: false, message: "Couldn't save the expense. Try again." });
  mockRpc.mockRejectedValue(new Error("Network request failed"));
  expect((await createExpense(input)).ok).toBe(false);
});

test("5.1 a custom split sends the method and each entered value", async () => {
  mockRpc.mockResolvedValue({ error: null });
  await createExpense({ ...input, method: "custom" });
  expect(mockRpc.mock.calls[0][1]).toMatchObject({
    p_split_method: "custom",
    p_split: [{ member_id: "a", owed_minor: 500, split_value: 500 }, { member_id: "b", owed_minor: 500, split_value: 500 }],
  });
});

test("5.2 a percentage split sends the method and each person's basis points", async () => {
  mockRpc.mockResolvedValue({ error: null });
  await createExpense({ ...input, method: "percentage", values: { a: 6000, b: 4000 } });
  expect(mockRpc.mock.calls[0][1]).toMatchObject({
    p_split_method: "percentage",
    p_split: [{ member_id: "a", owed_minor: 500, split_value: 6000 }, { member_id: "b", owed_minor: 500, split_value: 4000 }],
  });
});

test("5.3 a shares split sends the method and each person's shares", async () => {
  mockRpc.mockResolvedValue({ error: null });
  await createExpense({ ...input, method: "shares", values: { a: 3, b: 1 } });
  expect(mockRpc.mock.calls[0][1]).toMatchObject({
    p_split_method: "shares",
    p_split: [{ member_id: "a", owed_minor: 500, split_value: 3 }, { member_id: "b", owed_minor: 500, split_value: 1 }],
  });
});

test("5.7 an edit sends the version the user opened, the new split and the payer", async () => {
  mockRpc.mockResolvedValue({ error: null });
  expect(await updateExpense({ expenseId: "e1", version: 4, title: "Dinner", amountMinor: 1000, date: "2026-12-02", paidBy: "b", split: input.split })).toEqual({ ok: true });
  expect(mockRpc).toHaveBeenCalledWith("update_expense", {
    p_expense: "e1", p_version: 4, p_title: "Dinner", p_amount_minor: 1000, p_expense_date: "2026-12-02", p_paid_by: "b", p_split_method: "equal",
    p_split: [{ member_id: "a", owed_minor: 500 }, { member_id: "b", owed_minor: 500 }],
  });
});

test("5.7 a stale edit and a non-creator get distinct messages", async () => {
  const base = { expenseId: "e1", version: 1, title: "x", amountMinor: 1000, date: "2026-12-02", paidBy: "b", split: input.split };
  mockRpc.mockResolvedValue({ error: { message: "stale_version" } });
  const stale = await updateExpense(base);
  expect(stale.ok === false && stale.message).toMatch(/Someone else just changed/);
  mockRpc.mockResolvedValue({ error: { code: "42501", message: "x" } });
  const denied = await updateExpense(base);
  expect(denied.ok === false && denied.message).toMatch(/person who added this expense or the trip owner/);
});

test("6.2 no connection and server hiccups are marked retryable; a validation rejection is not", async () => {
  mockRpc.mockRejectedValue(new Error("Network request failed"));
  expect(await createExpense(input)).toMatchObject({ ok: false, retry: true });
  mockRpc.mockResolvedValue({ error: { message: "TypeError: Network request failed" }, status: 0 });
  expect(await createExpense(input)).toMatchObject({ ok: false, retry: true });
  mockRpc.mockResolvedValue({ error: { message: "upstream" }, status: 503 });
  expect(await createExpense(input)).toMatchObject({ ok: false, retry: true });
  mockRpc.mockResolvedValue({ error: { message: "split_must_sum" }, status: 400 });
  expect((await createExpense(input) as { retry?: boolean }).retry).toBeUndefined();
});
