import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Notifications from "../../app/notifications";

const mockLoad = jest.fn();
const mockMark = jest.fn();
const mockSet = jest.fn();
const mockPush = jest.fn();
jest.mock("../api/notifications", () => ({
  loadInbox: (...a: unknown[]) => mockLoad(...a), markRead: (...a: unknown[]) => mockMark(...a), setPreference: (...a: unknown[]) => mockSet(...a),
}));
jest.mock("../hooks/useTripRealtime", () => ({ useMyNotificationsRealtime: jest.fn() }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const on = { trip_invitation: true, itinerary_change: true, new_expense: true, balance_change: true, settlement_update: true };
const item = (o: object) => ({ id: "n1", trip_id: "t1", type: "new_expense", read_at: null, created_at: "2026-12-02T10:00:00Z",
  payload: { actor: "Ben", title: "Dinner", amount_minor: 90000, currency: "INR", exponent: 2 }, ...o });
const inbox = (items: object[], enabled = on) => mockLoad.mockResolvedValue({ ok: true, items, enabled });
beforeEach(() => { jest.clearAllMocks(); mockMark.mockResolvedValue({ ok: true }); mockSet.mockResolvedValue({ ok: true }); });

test("6.4 notifications are listed in plain words with unread ones marked", async () => {
  inbox([item({}), item({ id: "n2", type: "settlement_update", read_at: "x", payload: { from: "Ben", to: "Asha", amount_minor: 30000, currency: "INR", exponent: 2, kind: "payment" } })]);
  await render(<Notifications />);
  expect(await screen.findByText("Ben added Dinner · ₹900.00")).toBeTruthy();
  expect(screen.getByText("Ben paid Asha ₹300.00")).toBeTruthy();
  expect(screen.getAllByLabelText(/^Unread\./)).toHaveLength(1);
});

test("6.4 tapping an unread notification marks it read and opens the right screen of its trip", async () => {
  inbox([item({})]);
  await render(<Notifications />);
  await fireEvent.press(await screen.findByRole("button", { name: /Unread. Ben added Dinner/ }));
  expect(mockMark).toHaveBeenCalledWith("n1");
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/expenses", params: { id: "t1" } });
  expect(screen.queryByLabelText(/^Unread\./)).toBeNull();
});

test("6.4 an empty inbox explains what will show up, and the choices are still there", async () => {
  inbox([]);
  await render(<Notifications />);
  expect(await screen.findByText(/Nothing yet/)).toBeTruthy();
  expect(screen.getByLabelText("New expenses")).toBeTruthy();
});

test("6.4 each type can be turned off, and the choice is saved", async () => {
  inbox([]);
  await render(<Notifications />);
  await fireEvent(await screen.findByLabelText("Itinerary changes"), "valueChange", false);
  expect(mockSet).toHaveBeenCalledWith("itinerary_change", false);
  expect(screen.getByLabelText("Itinerary changes").props.value).toBe(false);
});

test("6.4 turned-off types show as off", async () => {
  inbox([], { ...on, balance_change: false });
  await render(<Notifications />);
  expect((await screen.findByLabelText("Balance changes")).props.value).toBe(false);
  expect(screen.getByLabelText("Payments").props.value).toBe(true);
});

test("6.4 a preference that fails to save shows why and reloads the real state", async () => {
  inbox([]);
  mockSet.mockResolvedValue({ ok: false, message: "No connection. Check your internet and try again." });
  await render(<Notifications />);
  await fireEvent(await screen.findByLabelText("Payments"), "valueChange", false);
  expect(await screen.findByText(/No connection/)).toBeTruthy();
  await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(2));
});

test("6.4 a load failure shows retry", async () => {
  mockLoad.mockResolvedValueOnce({ ok: false, message: "No connection. Check your internet and try again." });
  inbox([item({})]);
  await render(<Notifications />);
  await fireEvent.press(await screen.findByRole("button", { name: "Retry" }));
  expect(await screen.findByText("Ben added Dinner · ₹900.00")).toBeTruthy();
});
