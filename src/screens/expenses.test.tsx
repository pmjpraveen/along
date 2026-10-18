import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Platform, StyleSheet } from "react-native";
import Expenses from "../../app/trip/[id]/(tabs)/expenses";
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
let mockAccess = true;
const mockDeleteExpense = jest.fn();
jest.mock("../api/expenses", () => ({ listExpenses: (...a: unknown[]) => mockList(...a), loadExpenseAccess: async () => mockAccess, deleteExpense: (...a: unknown[]) => mockDeleteExpense(...a) }));
// These scenarios give each person's total; the list of who owes whom is whatever the API returns, so a scenario that does not spell it out gets one
// that settles the totals, and the screen is tested on how it shows and acts on that list.
jest.mock("../api/balances", () => ({
  loadBalances: async (...a: unknown[]) => {
    const r = await mockBal(...a);
    if (!r?.ok || r.transfers) return r;
    const { simplifyDebts } = require("../domain/balance");
    return { ...r, transfers: simplifyDebts(r.rows.map((x: { memberId: string; net: number }) => ({ memberId: x.memberId, net: x.net }))) };
  },
}));
jest.mock("expo-router", () => ({
  useGlobalSearchParams: () => ({ id: "t1" }), useLocalSearchParams: () => ({ id: "t1" }), useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
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
  mockQueued = []; mockAccess = true;
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
  expect(screen.getByLabelText(/^Ben\. Owes ₹500\.00\./)).toBeTruthy();   // everyone's totals are open by default
  expect(screen.getByLabelText(/^Rahul\. Settled up\./)).toBeTruthy();
});

test("5.4 the balances screen shows my net, then who owes whom in plain words", async () => {
  mockBal.mockResolvedValue({ ok: true, currency: cur, rows: [
    { memberId: "m1", name: "Asha", guest: false, isMe: true, isOwner: false, net: -80000 },
    { memberId: "m2", name: "Ben", guest: false, isMe: false, isOwner: false, net: 50000 },
    { memberId: "m3", name: "Rahul", guest: true, isMe: false, isOwner: false, net: 30000 },
  ] });
  await render(<Balances />);
  expect(await screen.findByText("You owe ₹800.00")).toBeTruthy();
  expect(screen.getByText("You need to pay")).toBeTruthy();   // my card is open: who I owe, with amounts
  expect(screen.getAllByText("₹500.00").length).toBeGreaterThan(0);
  expect(screen.getAllByText("₹300.00").length).toBeGreaterThan(0);
  expect(screen.getByLabelText(/^Ben\. Gets back ₹500\.00\./)).toBeTruthy();
});

test("5.4 when everyone is at zero it says so, and shows no To settle up section", async () => {
  mockBal.mockResolvedValue({ ok: true, currency: cur, rows: rows.map((r) => ({ ...r, net: 0 })) });
  await render(<Balances />);
  expect(await screen.findByText("You're settled up")).toBeTruthy();
  expect(screen.queryByText("To settle up")).toBeNull();
  expect(screen.queryByText("Everyone's settled up.")).toBeNull();
});

test("4.5 a balances load failure shows retry", async () => {
  mockBal.mockResolvedValue({ ok: false, message: "You're offline. Check your connection and try again." });
  await render(<Balances />);
  expect(await screen.findByRole("button", { name: "Retry" })).toBeTruthy();
});

test("5.5 a payment I am part of has one Record a payment button that goes straight to the confirm screen when it is the only one", async () => {
  mockBal.mockResolvedValue({ ok: true, currency: cur, rows: [
    { memberId: "m1", name: "Asha", guest: false, isMe: true, isOwner: false, net: -50000 },
    { memberId: "m2", name: "Ben", guest: false, isMe: false, isOwner: false, net: 50000 },
  ] });
  await render(<Balances />);
  await fireEvent.press(await screen.findByRole("button", { name: "Record a payment" }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/settle", params: { id: "t1", from: "m1", to: "m2", amount: "50000" } });
});

test("5.5 a payment between two other people has no Record a payment button here", async () => {
  mockBal.mockResolvedValue({ ok: true, currency: cur, rows: [
    { memberId: "m1", name: "Asha", guest: false, isMe: true, isOwner: false, net: 0 },
    { memberId: "m2", name: "Ben", guest: false, isMe: false, isOwner: false, net: 50000 },
    { memberId: "m3", name: "Rahul", guest: true, isMe: false, isOwner: false, net: -50000 },
  ] });
  await render(<Balances />);
  await fireEvent.press(await screen.findByLabelText(/^Ben\./));   // payments between two other people show when that person is opened
  expect(await screen.findByText("Ben gets back from")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Record a payment" })).toBeNull();
});

test("5.6 the organiser can record a payment involving a guest, so a guest's payment can be recorded for them", async () => {
  mockBal.mockResolvedValue({ ok: true, currency: cur, rows: [
    { memberId: "m1", name: "Asha", guest: false, isMe: true, isOwner: true, net: 0 },
    { memberId: "m2", name: "Ben", guest: false, isMe: false, isOwner: false, net: -30000 },
    { memberId: "m3", name: "Rahul", guest: true, isMe: false, isOwner: false, net: 30000 },
  ] });
  await render(<Balances />);
  await fireEvent.press(await screen.findByLabelText(/^Ben\./));   // payments between two other people show when that person is opened
  expect(await screen.findByText("Ben needs to pay")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Record a payment" }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/settle", params: { id: "t1", from: "m2", to: "m3", amount: "30000" } });
});

test("5.6 a non-owner cannot record a payment for someone else's payment even if a guest is involved", async () => {
  mockBal.mockResolvedValue({ ok: true, currency: cur, rows: [
    { memberId: "m1", name: "Asha", guest: false, isMe: true, isOwner: false, net: 0 },
    { memberId: "m2", name: "Ben", guest: false, isMe: false, isOwner: true, net: -30000 },
    { memberId: "m3", name: "Rahul", guest: true, isMe: false, isOwner: false, net: 30000 },
  ] });
  await render(<Balances />);
  await fireEvent.press(await screen.findByLabelText(/^Ben\./));   // payments between two other people show when that person is opened
  expect(await screen.findByText("Ben needs to pay")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Record a payment" })).toBeNull();
});

test("each row says what the expense means for me: paid by me, owed to the payer, or just added by someone", async () => {
  mockList.mockResolvedValue({ ok: true, currency: cur, meId: "m1", trip: { name: "Goa", destination: "Goa" }, members: [{ name: "Asha", guest: false }], expenses: [
    { id: "e1", title: "Lunch", amount_minor: 100000, expense_date: "2026-12-02", paidBy: "Asha", addedBy: "Asha", paidById: "m1", addedById: "m1", myShareMinor: 50000, canEdit: true },
    { id: "e2", title: "Cab", amount_minor: 50000, expense_date: "2026-12-02", paidBy: "Ben", addedBy: "Ben", paidById: "m2", addedById: "m2", myShareMinor: 25000, canEdit: false },
    { id: "e3", title: "Museum", amount_minor: 30000, expense_date: "2026-12-02", paidBy: "Rahul", addedBy: "Rahul", paidById: "m3", addedById: "m3", myShareMinor: 0, canEdit: false },
  ] });
  await render(<Expenses />);
  expect(await screen.findByText("Paid by You")).toBeTruthy();
  expect(screen.getByText("Owed to Ben")).toBeTruthy();
  expect(screen.getByText("Added by Rahul")).toBeTruthy();
});

test("the header shows the trip, the total of every expense, and tapping any row opens that expense", async () => {
  mockList.mockResolvedValue({ ok: true, currency: cur, meId: "m1", trip: { name: "Japan Trip", destination: "Japan" }, members: [{ name: "Asha", guest: false }], expenses: [
    { id: "e1", title: "Lunch", amount_minor: 100000, expense_date: "2026-12-02", paidBy: "Asha", addedBy: "Asha", canEdit: true },
    { id: "e2", title: "Cab", amount_minor: 50005, expense_date: "2026-12-02", paidBy: "Ben", addedBy: "Ben", canEdit: false },
  ] });
  await render(<Expenses />);
  expect(await screen.findByText("Trip to Japan")).toBeTruthy();
  expect(screen.getByLabelText("Total expenses ₹1,500.05")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: /^Cab,/ }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/expense", params: { id: "t1", expenseId: "e2" } });
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
  expect(screen.getByText(/Saved on your phone/)).toBeTruthy();
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

test("on a completed trip a member sees the expenses but no way to add one; the owner still does", async () => {
  mockList.mockResolvedValue({ ok: true, currency: cur, expenses: [] });
  mockAccess = false;
  await render(<Expenses />);
  expect(await screen.findByText(/only the owner can add one/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Add an expense" })).toBeNull();
});

test("US-15 the organiser can record every payment, including between two members who both have accounts", async () => {
  mockBal.mockResolvedValue({ ok: true, currency: cur, rows: [
    { memberId: "m1", name: "Asha", guest: false, isMe: true, isOwner: true, net: 0 },
    { memberId: "m2", name: "Ben", guest: false, isMe: false, isOwner: false, net: -30000 },
    { memberId: "m3", name: "Cy", guest: false, isMe: false, isOwner: false, net: 30000 },
  ] });
  await render(<Balances />);
  await fireEvent.press(await screen.findByLabelText(/^Ben\./));   // payments between two other people show when that person is opened
  expect(await screen.findByText("Ben needs to pay")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Record a payment" }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/settle", params: { id: "t1", from: "m2", to: "m3", amount: "30000" } });
});

test("US-15 a member who is not the organiser can record only payments they are part of", async () => {
  mockBal.mockResolvedValue({ ok: true, currency: cur, rows: [
    { memberId: "m1", name: "Asha", guest: false, isMe: true, isOwner: false, net: 0 },
    { memberId: "m2", name: "Ben", guest: false, isMe: false, isOwner: true, net: -30000 },
    { memberId: "m3", name: "Cy", guest: false, isMe: false, isOwner: false, net: 30000 },
  ] });
  await render(<Balances />);
  await fireEvent.press(await screen.findByLabelText(/^Ben\./));   // payments between two other people show when that person is opened
  expect(await screen.findByText("Ben needs to pay")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Record a payment" })).toBeNull();
});

test("US-14 Transactions and Balances are a switch at the top of the page, so balances never sink below a long list", async () => {
  await render(<Expenses />);
  expect(await screen.findByRole("tab", { name: "Transactions" })).toBeTruthy();
  expect(screen.getByRole("tab", { name: "Balances" })).toBeTruthy();
  expect(screen.getByText("Lunch")).toBeTruthy();
  expect(screen.queryByText("You'll get back from")).toBeNull();
  await fireEvent.press(screen.getByRole("tab", { name: "Balances" }));
  expect(await screen.findByText("You'll get back from")).toBeTruthy();
  expect(screen.queryByText("Lunch")).toBeNull();
  expect(screen.queryByText("See everyone's balances")).toBeNull();   // the old link at the bottom of the list is gone
});

test("US-14 the switch is there even when I am settled up", async () => {
  mockBal.mockResolvedValue({ ok: true, currency: cur, rows: rows.map((r) => ({ ...r, net: 0 })) });
  await render(<Expenses />);
  expect(await screen.findByRole("tab", { name: "Balances" })).toBeTruthy();
});

test("US-14 the Balances view can still start a payment", async () => {
  await render(<Expenses />);
  await fireEvent.press(await screen.findByRole("tab", { name: "Balances" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Record a payment" }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/settle", params: { id: "t1", from: "m2", to: "m1", amount: "50000" } });
});

test("US-14 a balances failure shows its message and Retry inside the Balances view", async () => {
  mockBal.mockResolvedValue({ ok: false, message: "No connection." });
  await render(<Expenses />);
  await fireEvent.press(await screen.findByRole("tab", { name: "Balances" }));
  expect(await screen.findByText("No connection.")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
});

// The delete dialog reports "fully closed" from the platform's own dismiss on iOS, which Jest does not run; Android reports it itself.
describe("deleting an expense", () => {
  beforeAll(() => { jest.replaceProperty(Platform, "OS", "android"); });
  const startDelete = async () => fireEvent(await screen.findByLabelText(/^Lunch, /), "accessibilityAction", { nativeEvent: { actionName: "delete" } });

  test("US-07 the person who added an expense, or the owner, deletes it after a confirmation, and the list reloads", async () => {
    mockDeleteExpense.mockResolvedValue({ ok: true });
    await render(<Expenses />);
    await startDelete();
    expect(await screen.findByText("Delete Lunch?")).toBeTruthy();
    expect(mockDeleteExpense).not.toHaveBeenCalled();
    const loadsBefore = mockList.mock.calls.length;
    await fireEvent.press(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(mockDeleteExpense).toHaveBeenCalledWith("e1"));
    await waitFor(() => expect(mockList.mock.calls.length).toBeGreaterThan(loadsBefore));
  });

  test("US-07 a swipeable expense row is opaque, so the red Delete behind it is hidden until the row is swiped", async () => {
    await render(<Expenses />);
    const row = await screen.findByLabelText(/^Lunch, /);
    expect(StyleSheet.flatten(row.props.style)?.backgroundColor).toBeTruthy();
  });

  test("US-07 keeping the expense from the confirmation deletes nothing", async () => {
    await render(<Expenses />);
    await startDelete();
    await fireEvent.press(await screen.findByRole("button", { name: "Keep" }));
    expect(mockDeleteExpense).not.toHaveBeenCalled();
  });

  test("US-07 a refused delete says why and keeps the dialog open", async () => {
    mockDeleteExpense.mockResolvedValue({ ok: false, message: "Only the person who added this expense or the trip owner can delete it." });
    await render(<Expenses />);
    await startDelete();
    await fireEvent.press(await screen.findByRole("button", { name: "Delete" }));
    expect(await screen.findByText("Only the person who added this expense or the trip owner can delete it.")).toBeTruthy();
  });

  test("US-07 someone who did not add the expense (and is not the owner) gets no delete option", async () => {
    mockList.mockResolvedValue({ ok: true, currency: cur, expenses: [{ id: "e9", title: "Taxi", amount_minor: 30000, expense_date: "2026-12-02", paidBy: "Ben", addedBy: "Ben", canEdit: false }] });
    await render(<Expenses />);
    await fireEvent(await screen.findByLabelText(/^Taxi, /), "accessibilityAction", { nativeEvent: { actionName: "delete" } });
    expect(screen.queryByText("Delete Taxi?")).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete Taxi" })).toBeNull();
  });
});

test("US-07 transactions are grouped under day headers with each day's total, newest day first", async () => {
  mockList.mockResolvedValue({ ok: true, currency: cur, trip: { name: "Goa", destination: "Goa", cardColor: 2, start: "2026-12-01", end: "2026-12-05" }, expenses: [
    { id: "e1", title: "Dinner", amount_minor: 30000, expense_date: "2026-12-03", paidBy: "Asha", addedBy: "Asha", canEdit: true },
    { id: "e2", title: "Cab", amount_minor: 20000, expense_date: "2026-12-03", paidBy: "Ben", addedBy: "Ben", canEdit: false },
    { id: "e3", title: "Hotel", amount_minor: 100000, expense_date: "2026-12-01", paidBy: "Asha", addedBy: "Asha", canEdit: true },
    { id: "e4", title: "Flights", amount_minor: 500000, expense_date: "2026-11-20", paidBy: "Asha", addedBy: "Asha", canEdit: true },
  ] });
  await render(<Expenses />);
  expect(await screen.findByLabelText("Day 3 · 3 Dec, ₹500.00")).toBeTruthy();
  expect(screen.getByLabelText("Day 1 · 1 Dec, ₹1,000.00")).toBeTruthy();
  expect(screen.getByLabelText("Before the trip, ₹5,000.00")).toBeTruthy();   // never hidden, even outside the trip's dates
  expect(screen.queryByText("Day 2 · 2 Dec")).toBeNull();                      // a day with nothing is not listed
});

test("US-07 each day's band is a sticky header: the sticky indices point exactly at the bands, which sit right after the page title, summary and switch", async () => {
  mockList.mockResolvedValue({ ok: true, currency: cur, trip: { name: "Goa", destination: "Goa", cardColor: 2, start: "2026-12-01", end: "2026-12-05" }, expenses: [
    { id: "e1", title: "Dinner", amount_minor: 30000, expense_date: "2026-12-03", paidBy: "Asha", addedBy: "Asha", canEdit: true },
    { id: "e3", title: "Hotel", amount_minor: 100000, expense_date: "2026-12-01", paidBy: "Asha", addedBy: "Asha", canEdit: true },
  ] });
  await render(<Expenses />);
  await screen.findByLabelText("Day 3 · 3 Dec, ₹300.00");
  const scroll = screen.getByTestId("expenses-scroll");
  // children: 0 page title, 1 summary, 2 switch, 3 day band, 4 its rows, 5 day band, 6 its rows
  expect(scroll.props.stickyHeaderIndices).toEqual([3, 5]);
});

test("US-14 with several payments to record, one button opens a list and picking one opens its confirm screen", async () => {
  mockBal.mockResolvedValue({ ok: true, currency: cur, rows: [
    { memberId: "m1", name: "Asha", guest: false, isMe: true, isOwner: false, net: 0 },
    { memberId: "m2", name: "Ben", guest: false, isMe: false, isOwner: false, net: 50000 },
    { memberId: "m3", name: "Cy", guest: false, isMe: false, isOwner: false, net: -50000 },
  ], transfers: [{ from: "m1", to: "m2", amountMinor: 30000 }, { from: "m3", to: "m1", amountMinor: 20000 }] });
  await render(<Balances />);
  expect(screen.queryByRole("button", { name: "Settle up" })).toBeNull();          // no button on every row
  await fireEvent.press(await screen.findByRole("button", { name: "Record a payment" }));
  expect(mockPush).not.toHaveBeenCalled();
  await fireEvent.press(await screen.findByRole("button", { name: "Cy owes you, ₹200.00" }));
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/settle", params: { id: "t1", from: "m3", to: "m1", amount: "20000" } }));
});

test("US-14 Record a payment sits in each person's card and lists only that person's payments", async () => {
  mockBal.mockResolvedValue({ ok: true, currency: cur, rows: [
    { memberId: "m1", name: "Asha", guest: false, isMe: true, isOwner: true, net: 0 },
    { memberId: "m2", name: "Ben", guest: false, isMe: false, isOwner: false, net: -50000 },
    { memberId: "m3", name: "Cy", guest: false, isMe: false, isOwner: false, net: 30000 },
    { memberId: "m4", name: "Di", guest: false, isMe: false, isOwner: false, net: 20000 },
  ], transfers: [{ from: "m2", to: "m3", amountMinor: 30000 }, { from: "m2", to: "m4", amountMinor: 20000 }] });
  await render(<Balances />);
  expect(await screen.findByLabelText(/^Ben\./)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Record a payment" })).toBeNull();     // my card has nothing to record
  await fireEvent.press(screen.getByLabelText(/^Cy\./));
  await fireEvent.press(screen.getByRole("button", { name: "Record a payment" }));  // Cy has one payment, so it goes straight to confirm
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/settle", params: { id: "t1", from: "m2", to: "m3", amount: "30000" } });
  mockPush.mockClear();
  await fireEvent.press(screen.getByLabelText(/^Ben\./));
  await fireEvent.press(screen.getByRole("button", { name: "Record a payment" }));  // Ben has two: the sheet lists his, not everyone's
  expect(await screen.findByRole("button", { name: "Ben owes Cy, ₹300.00" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Ben owes Di, ₹200.00" })).toBeTruthy();
});

test("US-14 tapping a person in a payment list opens the confirm screen for that payment, like the button", async () => {
  mockBal.mockResolvedValue({ ok: true, currency: cur, rows: [
    { memberId: "m1", name: "Asha", guest: false, isMe: true, isOwner: false, net: 50000 },
    { memberId: "m2", name: "Ben", guest: false, isMe: false, isOwner: false, net: -30000 },
    { memberId: "m3", name: "Cy", guest: false, isMe: false, isOwner: false, net: -20000 },
  ], transfers: [{ from: "m2", to: "m1", amountMinor: 30000 }, { from: "m3", to: "m1", amountMinor: 20000 }] });
  await render(<Balances />);
  await fireEvent.press(await screen.findByRole("button", { name: /^Record a payment: .*Ben, ₹300\.00$/ }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/settle", params: { id: "t1", from: "m2", to: "m1", amount: "30000" } });
});

test("US-14 a person in a payment I cannot record is not tappable", async () => {
  mockBal.mockResolvedValue({ ok: true, currency: cur, rows: [
    { memberId: "m1", name: "Asha", guest: false, isMe: true, isOwner: false, net: 0 },
    { memberId: "m2", name: "Ben", guest: false, isMe: false, isOwner: false, net: -30000 },
    { memberId: "m3", name: "Cy", guest: false, isMe: false, isOwner: false, net: 30000 },
  ], transfers: [{ from: "m2", to: "m3", amountMinor: 30000 }] });
  await render(<Balances />);
  await fireEvent.press(await screen.findByLabelText(/^Ben\./));
  expect(screen.queryByRole("button", { name: /^Record a payment:/ })).toBeNull();
});
