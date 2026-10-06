import { loadBalances } from "./balances";

const mockFrom = jest.fn();
const mockSigned = jest.fn();
jest.mock("./supabase", () => ({ supabase: {
  from: (...a: unknown[]) => mockFrom(...a),
  storage: { from: () => ({ createSignedUrls: (...a: unknown[]) => mockSigned(...a) }) },
  auth: { getSession: async () => ({ data: { session: { user: { id: "u-me" } } } }) },
} }));

// A query builder that ignores its filters and resolves with the rows given for that table.
const table = (rows: unknown, extra: object = {}) => {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "is", "order", "single"]) q[m] = () => q;
  q.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null, ...extra }).then(ok);
  return q;
};

const members = [
  { id: "p", user_id: "u-me", display_name: "Praveen", membership_type: "registered", role: "owner" },
  { id: "h", user_id: "u-h", display_name: "Hemant", membership_type: "registered", role: "member" },
  { id: "a", user_id: null, display_name: "Anusha", membership_type: "guest", role: "guest" },
  { id: "m", user_id: null, display_name: "Mohan", membership_type: "guest", role: "guest" },
];
const setup = (settlements: object[] = []) => mockFrom.mockImplementation((t: string) => {
  if (t === "trips") return table({ primary_currency: "INR", currencies: { minor_unit_exponent: 2 } });
  if (t === "trip_members") return table(members);
  if (t === "trip_member_balances") return table([{ member_id: "p", net_minor: 2000 }, { member_id: "h", net_minor: 1000 }, { member_id: "a", net_minor: -1000 }, { member_id: "m", net_minor: -2000 }]);
  if (t === "expenses") return table([{ id: "e1", paid_by_member_id: "p" }, { id: "e2", paid_by_member_id: "h" }]);
  if (t === "expense_participants") return table([
    { expense_id: "e1", trip_member_id: "p", owed_amount_minor: 1000 }, { expense_id: "e1", trip_member_id: "m", owed_amount_minor: 2000 },
    { expense_id: "e2", trip_member_id: "h", owed_amount_minor: 1000 }, { expense_id: "e2", trip_member_id: "a", owed_amount_minor: 1000 },
  ]);
  if (t === "settlements") return table(settlements);
  throw new Error(`unexpected table ${t}`);
});
beforeEach(() => { mockFrom.mockReset(); mockSigned.mockReset(); mockSigned.mockResolvedValue({ data: [] }); });

test("US-14 balances list each person's total, and who owes whom exactly as the expenses say", async () => {
  setup();
  const r = await loadBalances("t1");
  if (!r.ok) throw new Error("expected ok");
  expect(r.rows.map((x) => [x.name, x.net, x.isMe])).toEqual([["Praveen", 2000, true], ["Hemant", 1000, false], ["Anusha", -1000, false], ["Mohan", -2000, false]]);
  expect(r.transfers).toEqual([{ from: "m", to: "p", amountMinor: 2000 }, { from: "a", to: "h", amountMinor: 1000 }]);   // Anusha owes Hemant, not Praveen
});

test("US-14 a payment reduces the line it is against, and a reversal puts it back", async () => {
  setup([{ kind: "payment", from_member_id: "m", to_member_id: "p", amount_minor: 500 }]);
  const paid = await loadBalances("t1");
  expect(paid.ok && paid.transfers.find((x) => x.from === "m")).toEqual({ from: "m", to: "p", amountMinor: 1500 });
  setup([{ kind: "payment", from_member_id: "m", to_member_id: "p", amount_minor: 500 }, { kind: "reversal", from_member_id: "m", to_member_id: "p", amount_minor: 500 }]);
  const undone = await loadBalances("t1");
  expect(undone.ok && undone.transfers.find((x) => x.from === "m")).toEqual({ from: "m", to: "p", amountMinor: 2000 });
});

test("US-14 a failed read of any of the tables gives a plain error, not partial balances", async () => {
  setup();
  mockFrom.mockImplementation((t: string) => (t === "settlements" ? table(null, { error: { message: "boom" } }) : table(t === "trips" ? { primary_currency: "INR", currencies: { minor_unit_exponent: 2 } } : [])));
  const r = await loadBalances("t1");
  expect(r.ok).toBe(false);
});

test("US-14 each person's profile photo comes with their balance, and a person with none has none", async () => {
  setup();
  const withPhoto = members.map((m) => (m.id === "h" ? { ...m, avatar_url: "u-h/photo.jpg" } : { ...m, avatar_url: null }));
  const base = mockFrom.getMockImplementation()!;
  mockFrom.mockImplementation((t: string) => (t === "trip_members" ? table(withPhoto) : base(t)));
  mockSigned.mockResolvedValue({ data: [{ path: "u-h/photo.jpg", signedUrl: "https://signed/h.jpg" }] });
  const r = await loadBalances("t1");
  expect(r.ok && r.rows.map((x) => [x.name, x.avatarUrl])).toEqual([["Praveen", null], ["Hemant", "https://signed/h.jpg"], ["Anusha", null], ["Mohan", null]]);
});
