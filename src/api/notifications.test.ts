import { loadInbox, markRead, setPreference } from "./notifications";

const mockRpc = jest.fn();
const mockFrom = jest.fn();
jest.mock("./supabase", () => ({ supabase: { rpc: (...a: unknown[]) => mockRpc(...a), from: (...a: unknown[]) => mockFrom(...a) } }));
beforeEach(() => { mockRpc.mockReset(); mockFrom.mockReset(); });

const table = (rows: unknown[], error: { message: string } | null = null) => {
  const q: any = { select: () => q, order: () => q, limit: () => q, is: () => q, then: (r: (v: unknown) => void) => r({ data: rows, error }) };
  return q;
};

test("6.4 the inbox lists notifications and defaults every type to on unless turned off", async () => {
  mockFrom.mockImplementation((t: string) => (t === "notifications"
    ? table([{ id: "n1", type: "new_expense", payload: {}, read_at: null, created_at: "x", trip_id: "t" }])
    : table([{ type: "itinerary_change", enabled: false }])));
  const r = await loadInbox();
  expect(r.ok && r.items).toHaveLength(1);
  expect(r.ok && r.enabled).toEqual({ trip_invitation: true, itinerary_change: false, new_expense: true, balance_change: true, settlement_update: true });
});

test("6.4 a failed load returns a message", async () => {
  mockFrom.mockImplementation(() => table([], { message: "boom" }));
  expect(await loadInbox()).toEqual({ ok: false, message: "Couldn't load notifications. Try again." });
});

test("6.4 marking read and changing a preference call the server functions", async () => {
  mockRpc.mockResolvedValue({ error: null });
  expect(await markRead("n1")).toEqual({ ok: true });
  expect(mockRpc).toHaveBeenCalledWith("mark_notification_read", { p_id: "n1" });
  expect(await setPreference("new_expense", false)).toEqual({ ok: true });
  expect(mockRpc).toHaveBeenCalledWith("set_notification_preference", { p_type: "new_expense", p_enabled: false });
});

test("6.4 offline failures say so", async () => {
  mockRpc.mockRejectedValue(new Error("Network request failed"));
  expect(await markRead("n1")).toEqual({ ok: false, message: "You're offline. Check your connection and try again." });
});
