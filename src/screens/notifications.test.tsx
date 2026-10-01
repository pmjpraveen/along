import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Notifications from "../../app/notifications";

const mockLoad = jest.fn();
const mockMark = jest.fn();
const mockPush = jest.fn();
jest.mock("../api/notifications", () => ({ loadInbox: (...a: unknown[]) => mockLoad(...a), markRead: (...a: unknown[]) => mockMark(...a) }));
jest.mock("../hooks/useTripRealtime", () => ({ useMyNotificationsRealtime: jest.fn() }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const on = { trip_invitation: true, itinerary_change: true, new_expense: true, balance_change: true, settlement_update: true };
const item = (o: object) => ({ id: "n1", trip_id: "t1", type: "new_expense", read_at: null, created_at: "2026-12-02T10:00:00Z",
  payload: { actor: "Ben", title: "Dinner", amount_minor: 90000, currency: "INR", exponent: 2 }, ...o });
const inbox = (items: object[], enabled = on) => mockLoad.mockResolvedValue({ ok: true, items, enabled });
beforeEach(() => { jest.clearAllMocks(); mockMark.mockResolvedValue({ ok: true }); });

const time = "\\d\\d:\\d\\d [AP]M";

test("6.4 notifications are listed in plain words, with the time, and unread ones marked New", async () => {
  inbox([item({}), item({ id: "n2", type: "settlement_update", read_at: "x", payload: { from: "Ben", to: "Asha", amount_minor: 30000, currency: "INR", exponent: 2, kind: "payment" } })]);
  await render(<Notifications />);
  expect(await screen.findByLabelText(new RegExp(`^Unread\\. Ben added Dinner · ₹900\\.00, ${time}$`))).toBeTruthy();
  expect(screen.getByLabelText(new RegExp(`^Ben paid Asha ₹300\\.00, ${time}$`))).toBeTruthy();
  expect(screen.getAllByText("New")).toHaveLength(1);
});

test("6.4 notifications sit under a heading for their day, newest first", async () => {
  const now = new Date();
  inbox([item({ id: "a", created_at: now.toISOString() }), item({ id: "b", created_at: new Date(2020, 0, 5, 9, 0).toISOString() })]);
  await render(<Notifications />);
  expect(await screen.findByLabelText("Today")).toBeTruthy();
  expect(screen.getByLabelText("5 Jan")).toBeTruthy();
});

test("6.4 tapping an unread notification marks it read and opens the right screen of its trip", async () => {
  inbox([item({})]);
  await render(<Notifications />);
  await fireEvent.press(await screen.findByRole("button", { name: /^Unread\. Ben added Dinner/ }));
  expect(mockMark).toHaveBeenCalledWith("n1");
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/expenses", params: { id: "t1" } });
  expect(screen.queryByText("New")).toBeNull();
});

test("6.4 an empty inbox explains what will show up", async () => {
  inbox([]);
  await render(<Notifications />);
  expect(await screen.findByText(/All quiet/)).toBeTruthy();
});

test("6.4 a load failure shows retry", async () => {
  mockLoad.mockResolvedValueOnce({ ok: false, message: "You're offline. Check your connection and try again." });
  inbox([item({})]);
  await render(<Notifications />);
  await fireEvent.press(await screen.findByRole("button", { name: "Retry" }));
  expect(await screen.findByLabelText(/Ben added Dinner/)).toBeTruthy();
});
