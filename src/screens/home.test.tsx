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
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
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
  expect(screen.queryByText("Ooty weekend")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Goa with the gang, Ongoing" }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/people", params: { id: "t1" } });
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

test("Home with no trips invites the first one and still offers Start new trip", async () => {
  mockList.mockResolvedValue({ ok: true, trips: [] });
  await render(<Home />);
  expect(await screen.findByText(/No trips yet/)).toBeTruthy();
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

test("each trip card shows its cover photo, or its destination when it has none", async () => {
  mockList.mockResolvedValue({ ok: true, trips: [trip({ coverUrl: "https://example.com/goa.jpg" }), trip({ id: "t2", name: "Ooty weekend", destination_name: "Ooty, India", coverUrl: null })] });
  await render(<Home />);
  expect(await screen.findByRole("image", { name: "Cover photo of Goa, India" })).toBeTruthy();
  expect(screen.getByText("OOTY, INDIA")).toBeTruthy();
});
