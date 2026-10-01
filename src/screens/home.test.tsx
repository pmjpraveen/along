import { fireEvent, render, screen } from "@testing-library/react-native";
import Home from "../../app/index";
import { useSession } from "../stores/session";

const mockList = jest.fn();
const mockPush = jest.fn();
jest.mock("../api/trips", () => ({ listTrips: (...a: unknown[]) => mockList(...a) }));
jest.mock("../api/notifications", () => ({ unreadCount: async () => 0 }));
jest.mock("../api/profile", () => ({ loadMyName: async () => "Asha" }));
jest.mock("../api/supabase", () => ({ supabase: {} }));
jest.mock("../hooks/useTripRealtime", () => ({ useMyNotificationsRealtime: jest.fn() }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }), Redirect: () => null,
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]), useIsFocused: () => true,
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const trip = (o: object) => ({ id: "t1", name: "Goa with the gang", destination_name: "Goa, India", start_date: "2026-09-25", end_date: "2026-10-02", phase: "active", coverUrl: null, ...o });
beforeEach(() => { jest.clearAllMocks(); useSession.setState({ status: "in", pendingInvite: null }); });

test("Home greets me, lists trips I'm planning with their status and short dates, and keeps finished trips in History", async () => {
  mockList.mockResolvedValue({ ok: true, trips: [trip({}), trip({ id: "t2", name: "Ooty weekend", destination_name: "Ooty, India", start_date: "2026-05-07", end_date: "2026-05-09", phase: "completed" })] });
  await render(<Home />);
  expect(await screen.findByText("Goa with the gang")).toBeTruthy();
  expect(await screen.findByText("Asha")).toBeTruthy();
  expect(screen.getByText("Ongoing")).toBeTruthy();
  expect(screen.getByText("25 Sep - 2 Oct")).toBeTruthy();
  expect(screen.getByText("Goa, India")).toBeTruthy();
  expect(screen.queryByText("Ooty weekend")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Goa with the gang, Goa, India, 25 Sep - 2 Oct, Ongoing" }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]", params: { id: "t1" } });
});

test("notifications, profile and history are one tap from the top of Home", async () => {
  mockList.mockResolvedValue({ ok: true, trips: [trip({})] });
  await render(<Home />);
  await screen.findByText("Goa with the gang");
  await fireEvent.press(screen.getByRole("button", { name: "Notifications" }));
  expect(mockPush).toHaveBeenLastCalledWith("/notifications");
  await fireEvent.press(screen.getByRole("button", { name: "Profile and travel passport" }));
  expect(mockPush).toHaveBeenLastCalledWith("/profile");
  await fireEvent.press(screen.getByRole("button", { name: "Trip history" }));
  expect(mockPush).toHaveBeenLastCalledWith("/history");
});

test("Home with no trips shows the empty state with one Start new trip button, and no Planning or invite sections", async () => {
  mockList.mockResolvedValue({ ok: true, trips: [] });
  await render(<Home />);
  expect(await screen.findByText("No trips planned")).toBeTruthy();
  expect(screen.getByText("Plan new trip now with your friends")).toBeTruthy();
  expect(screen.queryByText("Planning")).toBeNull();
  expect(screen.queryByText("Invite friends")).toBeNull();
  expect(screen.getAllByRole("button", { name: "Start new trip" })).toHaveLength(1);
  await fireEvent.press(screen.getByRole("button", { name: "Start new trip" }));
  expect(mockPush).toHaveBeenCalledWith("/create-trip");
});

test("Home shows a retry when trips cannot be loaded", async () => {
  mockList.mockResolvedValueOnce({ ok: false, message: "No connection. Check your internet and try again." });
  await render(<Home />);
  expect(await screen.findByRole("alert")).toHaveTextContent(/No connection/);
  mockList.mockResolvedValueOnce({ ok: true, trips: [trip({})] });
  await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("Goa with the gang")).toBeTruthy();
});

test("each trip card shows its cover photo, or the default illustration when it has none", async () => {
  mockList.mockResolvedValue({ ok: true, trips: [trip({ coverUrl: "https://example.com/goa.jpg" }), trip({ id: "t2", name: "Ooty weekend", destination_name: "Ooty, India", coverUrl: null })] });
  await render(<Home />);
  expect(await screen.findByRole("image", { name: "Cover photo of Goa, India" })).toBeTruthy();
  expect(screen.getByRole("image", { name: "Ooty, India, default cover" })).toBeTruthy();
});

test("Home puts the ongoing trip first, even when it was started earlier than an upcoming one", async () => {
  mockList.mockResolvedValue({ ok: true, trips: [trip({ id: "u", name: "Later trip", phase: "upcoming" }), trip({ id: "a", name: "Happening now", phase: "active" })] });
  await render(<Home />);
  await screen.findByText("Happening now");
  const names = screen.getAllByRole("button").map((b) => b.props.accessibilityLabel as string).filter((l) => /^(Later trip|Happening now),/.test(l));
  expect(names[0]).toMatch(/^Happening now,/);
  expect(names[1]).toMatch(/^Later trip,/);
});
