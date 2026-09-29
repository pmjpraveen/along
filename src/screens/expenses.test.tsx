import { act, fireEvent, render, screen } from "@testing-library/react-native";
import Expenses from "../../app/trip/[id]/expenses";
import Balances from "../../app/trip/[id]/balances";

const mockList = jest.fn();
const mockBal = jest.fn();
const mockPush = jest.fn();
let mockRealtimeReload: (() => void) | undefined;
jest.mock("../hooks/useTripRealtime", () => ({
  useTripRealtime: (_id: string, _tables: string[], reload: () => void) => { mockRealtimeReload = reload; },
}));
let mockQueued: unknown[] = [];
const mockDiscard = jest.fn();
jest.mock("../offline/sync", () => ({
  useQueue: (select: (s: { items: unknown[] }) => unknown) => select({ items: mockQueued }),
  discardQueued: (...a: unknown[]) => mockDiscard(...a),
}));
jest.mock("../api/expenses", () => ({ listExpenses: (...a: unknown[]) => mockList(...a) }));
jest.mock("../api/balances", () => ({ loadBalances: (...a: unknown[]) => mockBal(...a) }));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "t1" }), useRouter: () => ({ push: mockPush }),
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const cur = { code: "INR", exponent: 2 };
const rows = [
  { memberId: "m2", name: "Ben", guest: false, isMe: false, isOwner: false, net: -50000 },
  { memberId: "m1", name: "Asha", guest: false, isMe: true, isOwner: false, net: 50000 },
  { memberId: "m3", name: "Rahul", guest: true, isMe: false, isOwner: false, net: 0 },
];
beforeEach(() => {
  jest.clearAllMocks();
  mockQueued = [];
  mockList.mockResolvedValue({ ok: true, currency: cur, expenses: [{ id: "e1", title: "Lunch", amount_minor: 100000, expense_date: "2026-12-02", paidBy: "Asha", addedBy: "Asha", canEdit: true }] });
  mockBal.mockResolvedValue({ ok: true, currency: cur, rows });
});

test("4.5 the expenses screen shows my running balance in plain words", async () => {
  await render(<Expenses />);
  expect(await screen.findByText("You're owed ₹500.00")).toBeTruthy();
  expect(screen.getByText("Lunch")).toBeTruthy();
});

test("4.5 a balance failure does not hide the expense list", async () => {
  mockBal.mockResolvedValue({ ok: false, message: "No connection." });
  await render(<Expenses />);
  expect(await screen.findByText("Lunch")).toBeTruthy();
  expect(screen.queryByText(/You're owed/)).toBeNull();
});

test("4.5 the balances screen lists everyone, me first, including members who are settled", async () => {
  await render(<Balances />);
  expect(await screen.findByText("You're owed ₹500.00")).toBeTruthy();
  expect(screen.getByText("Ben owes ₹500.00")).toBeTruthy();
  expect(screen.getByText("Rahul is settled up")).toBeTruthy();
});

test("5.4 the balances screen shows my net, then the simplified payments in plain words", async () => {
  mockBal.mockResolvedValue({ ok: true, currency: cur, rows: [
    { memberId: "m1", name: "Asha", guest: false, isMe: true, isOwner: false, net: -80000 },
    { memberId: "m2", name: "Ben", guest: false, isMe: false, isOwner: false, net: 50000 },
    { memberId: "m3", name: "Rahul", guest: true, isMe: false, isOwner: false, net: 30000 },
  ] });
  await render(<Balances />);
  expect(await screen.findByText("You owe ₹800.00")).toBeTruthy();
  expect(screen.getByText("You owe Ben ₹500.00")).toBeTruthy();
  expect(screen.getByText("You owe Rahul ₹300.00")).toBeTruthy();
  expect(screen.getByText("Ben is owed ₹500.00")).toBeTruthy();
});

test("5.4 when everyone is at zero it says so", async () => {
  mockBal.mockResolvedValue({ ok: true, currency: cur, rows: rows.map((r) => ({ ...r, net: 0 })) });
  await render(<Balances />);
  expect(await screen.findByText("Everyone is settled up.")).toBeTruthy();
  expect(screen.getByText("You're settled up")).toBeTruthy();
});

test("4.5 a balances load failure shows retry", async () => {
  mockBal.mockResolvedValue({ ok: false, message: "No connection. Check your internet and try again." });
  await render(<Balances />);
  expect(await screen.findByRole("button", { name: "Retry" })).toBeTruthy();
});

test("5.5 a payment I am part of has a Settle up button that opens the confirm screen with the amount", async () => {
  mockBal.mockResolvedValue({ ok: true, currency: cur, rows: [
    { memberId: "m1", name: "Asha", guest: false, isMe: true, isOwner: false, net: -50000 },
    { memberId: "m2", name: "Ben", guest: false, isMe: false, isOwner: false, net: 50000 },
  ] });
  await render(<Balances />);
  await fireEvent.press(await screen.findByRole("button", { name: "Settle up" }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/settle", params: { id: "t1", from: "m1", to: "m2", amount: "50000" } });
});

test("5.5 a payment between two other people has no Settle up button here", async () => {
  mockBal.mockResolvedValue({ ok: true, currency: cur, rows: [
    { memberId: "m1", name: "Asha", guest: false, isMe: true, isOwner: false, net: 0 },
    { memberId: "m2", name: "Ben", guest: false, isMe: false, isOwner: false, net: 50000 },
    { memberId: "m3", name: "Rahul", guest: true, isMe: false, isOwner: false, net: -50000 },
  ] });
  await render(<Balances />);
  expect(await screen.findByText("Rahul owes Ben ₹500.00")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Settle up" })).toBeNull();
});

test("5.6 the owner gets Settle up on a payment involving a guest, so a guest's payment can be recorded for them", async () => {
  mockBal.mockResolvedValue({ ok: true, currency: cur, rows: [
    { memberId: "m1", name: "Asha", guest: false, isMe: true, isOwner: true, net: 0 },
    { memberId: "m2", name: "Ben", guest: false, isMe: false, isOwner: false, net: -30000 },
    { memberId: "m3", name: "Rahul", guest: true, isMe: false, isOwner: false, net: 30000 },
  ] });
  await render(<Balances />);
  expect(await screen.findByText("Ben owes Rahul ₹300.00")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Settle up" }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/settle", params: { id: "t1", from: "m2", to: "m3", amount: "30000" } });
});

test("5.6 a non-owner gets no Settle up on someone else's payment even if a guest is involved", async () => {
  mockBal.mockResolvedValue({ ok: true, currency: cur, rows: [
    { memberId: "m1", name: "Asha", guest: false, isMe: true, isOwner: false, net: 0 },
    { memberId: "m2", name: "Ben", guest: false, isMe: false, isOwner: true, net: -30000 },
    { memberId: "m3", name: "Rahul", guest: true, isMe: false, isOwner: false, net: 30000 },
  ] });
  await render(<Balances />);
  expect(await screen.findByText("Ben owes Rahul ₹300.00")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Settle up" })).toBeNull();
});

test("5.7 an expense I can edit opens the edit screen; one I cannot edit is not tappable", async () => {
  mockList.mockResolvedValue({ ok: true, currency: cur, expenses: [
    { id: "e1", title: "Lunch", amount_minor: 100000, expense_date: "2026-12-02", paidBy: "Asha", addedBy: "Asha", canEdit: true },
    { id: "e2", title: "Cab", amount_minor: 50000, expense_date: "2026-12-02", paidBy: "Ben", addedBy: "Ben", canEdit: false },
  ] });
  await render(<Expenses />);
  await fireEvent.press(await screen.findByRole("button", { name: "Edit Lunch" }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/add-expense", params: { id: "t1", expenseId: "e1" } });
  expect(screen.queryByRole("button", { name: "Edit Cab" })).toBeNull();
});

test("6.1 a realtime change reloads the expense list and my balance without a pull", async () => {
  await render(<Expenses />);
  expect(await screen.findByText("Lunch")).toBeTruthy();
  mockList.mockResolvedValue({ ok: true, currency: cur, expenses: [
    { id: "e2", title: "Cab from airport", amount_minor: 50000, expense_date: "2026-12-03", paidBy: "Ben", addedBy: "Ben", canEdit: false },
    { id: "e1", title: "Lunch", amount_minor: 100000, expense_date: "2026-12-02", paidBy: "Asha", addedBy: "Asha", canEdit: true },
  ] });
  mockBal.mockResolvedValue({ ok: true, currency: cur, rows: rows.map((r) => (r.isMe ? { ...r, net: 25000 } : r)) });
  await act(async () => { mockRealtimeReload?.(); });
  expect(await screen.findByText("Cab from airport")).toBeTruthy();
  expect(screen.getByText("You're owed ₹250.00")).toBeTruthy();
});

test("6.1 a realtime change reloads the balances screen", async () => {
  await render(<Balances />);
  expect(await screen.findByText("You're owed ₹500.00")).toBeTruthy();
  mockBal.mockResolvedValue({ ok: true, currency: cur, rows: rows.map((r) => ({ ...r, net: 0 })) });
  await act(async () => { mockRealtimeReload?.(); });
  expect(await screen.findByText("You're settled up")).toBeTruthy();
});

const queuedItem = (o: object = {}) => ({ key: "k1", status: "pending", queuedAt: 1, payload: { tripId: "t1", title: "Taxi", amountMinor: 25050 }, ...o });

test("6.2 an expense saved offline shows in the list as waiting to sync, distinct but calm", async () => {
  mockQueued = [queuedItem()];
  await render(<Expenses />);
  expect(await screen.findByText("Taxi")).toBeTruthy();
  expect(screen.getByText("₹250.50")).toBeTruthy();
  expect(screen.getByText(/Saved on this phone. Will sync when you're back online/)).toBeTruthy();
});

test("6.2 a queued expense on an otherwise empty trip replaces the empty state", async () => {
  mockList.mockResolvedValue({ ok: true, currency: cur, expenses: [] });
  mockQueued = [queuedItem()];
  await render(<Expenses />);
  expect(await screen.findByText("Taxi")).toBeTruthy();
  expect(screen.queryByText(/No expenses yet/)).toBeNull();
});

test("6.2 queued expenses of another trip are not shown here", async () => {
  mockQueued = [queuedItem({ payload: { tripId: "other", title: "Elsewhere", amountMinor: 100 } })];
  await render(<Expenses />);
  await screen.findByText("Lunch");
  expect(screen.queryByText("Elsewhere")).toBeNull();
});

test("6.2 a rejected queued expense shows why and can be discarded", async () => {
  mockQueued = [queuedItem({ status: "failed", error: "Couldn't save the expense. Try again." })];
  await render(<Expenses />);
  expect(await screen.findByText("Couldn't sync Taxi")).toBeTruthy();
  expect(screen.getByText("Couldn't save the expense. Try again.")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Discard Taxi" }));
  expect(mockDiscard).toHaveBeenCalledWith("k1");
});
