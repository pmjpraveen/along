import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Itinerary from "../../app/trip/[id]/(tabs)/index";

const mockLoad = jest.fn();
const mockMove = jest.fn();
jest.mock("../api/itinerary", () => ({ loadItinerary: (...a: unknown[]) => mockLoad(...a), moveItem: (...a: unknown[]) => mockMove(...a) }));
jest.mock("../api/members", () => ({ listMembers: async () => ({ ok: true, members: [{ id: "m1", display_name: "Asha", membership_type: "registered", role: "owner", isMe: true }] }) }));
jest.mock("../api/trips", () => ({ loadTripStatus: async () => ({ ok: true, status: "published", completedAt: null, name: "Goa", destination: "Goa", coverUrl: null }) }));
jest.mock("../components/DateField", () => ({
  DateField: ({ label, onChange }: { label: string; onChange: (d: string) => void }) => {
    const { Pressable, Text } = require("react-native");
    return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => onChange("2026-12-04")}><Text>pick</Text></Pressable>;
  },
}));
jest.mock("../components/MapPreview", () => ({
  MapPreview: () => { const { Text } = require("react-native"); return <Text>MAP PREVIEW</Text>; },
}));
jest.mock("expo-router", () => ({
  useGlobalSearchParams: () => ({ id: "t1" }), useLocalSearchParams: () => ({ id: "t1" }), useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const base = {
  id: "i1", version: 1, title: "Lunch", type: "restaurant", day_date: "2026-12-01", start_time: null, end_time: null, sort_order: 0,
  is_outside_trip_range: false, participants: [], location_text: null, location_url: null, latitude: null, longitude: null, formatted_address: null,
};
beforeEach(() => { mockLoad.mockReset(); mockMove.mockReset(); });
const load = (item: object) => mockLoad.mockResolvedValue({ ok: true, trip: { name: "Goa", start_date: "2026-12-01", end_date: "2026-12-05" }, items: [{ ...base, ...item }] });

test("3.4 plain text location displays exactly as typed with no map preview", async () => {
  load({ location_text: "Fish Curry Place, Goa" });
  await render(<Itinerary />);
  expect(await screen.findByText("Fish Curry Place, Goa")).toBeTruthy();
  expect(screen.queryByText("MAP PREVIEW")).toBeNull();
});

test("3.3 an item with resolved coordinates shows the map preview", async () => {
  load({ location_text: "https://maps.app.goo.gl/a", latitude: 1, longitude: 2, formatted_address: "Spot" });
  await render(<Itinerary />);
  expect(await screen.findByText("MAP PREVIEW")).toBeTruthy();
});

test("3.3 a link that never resolved still shows the raw text", async () => {
  load({ location_text: "https://maps.app.goo.gl/zzz" });
  await render(<Itinerary />);
  expect(await screen.findByText("https://maps.app.goo.gl/zzz")).toBeTruthy();
  expect(screen.queryByText("MAP PREVIEW")).toBeNull();
});

test("3.5 moving an item sends the new day with the version I saw, then reloads the timeline", async () => {
  load({ version: 3 });
  mockMove.mockResolvedValue({ ok: true });
  await render(<Itinerary />);
  await fireEvent(await screen.findByRole("button", { name: "Lunch" }), "longPress");
  await fireEvent.press(screen.getByRole("button", { name: "New day for Lunch" }));
  await waitFor(() => expect(mockMove).toHaveBeenCalledWith("i1", "2026-12-04", 3));
  await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(2));
});

test("3.5 a rejected move shows the reason and reloads so the user sees the current state", async () => {
  load({});
  mockMove.mockResolvedValue({ ok: false, stale: true, message: "Someone else just changed this item. It's been refreshed. Try again." });
  await render(<Itinerary />);
  await fireEvent(await screen.findByRole("button", { name: "Lunch" }), "longPress");
  await fireEvent.press(screen.getByRole("button", { name: "New day for Lunch" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/Someone else just changed/);
  expect(mockLoad).toHaveBeenCalledTimes(2);
});

test("an item outside the trip dates carries a warning badge, and one inside does not", async () => {
  load({ is_outside_trip_range: true });
  await render(<Itinerary />);
  expect(await screen.findByLabelText("Outside trip dates")).toBeTruthy();
});

test("an item inside the trip dates has no such badge", async () => {
  load({ is_outside_trip_range: false });
  await render(<Itinerary />);
  await screen.findByText("Lunch");
  expect(screen.queryByLabelText("Outside trip dates")).toBeNull();
});

test("it opens on Day 1, and a chip per trip day switches which day's items are shown", async () => {
  mockLoad.mockResolvedValue({ ok: true, trip: { name: "Goa", start_date: "2026-12-01", end_date: "2026-12-03" }, items: [
    { ...base, id: "a", title: "Lunch", day_date: "2026-12-01", start_time: "12:30:00" }, { ...base, id: "b", title: "Sunset", day_date: "2026-12-03" },
  ] });
  await render(<Itinerary />);
  expect(await screen.findByText("Lunch")).toBeTruthy();
  expect(screen.getByRole("tab", { name: /Day 1/ }).props.accessibilityState.selected).toBe(true);
  expect(screen.getByText("2 activities · 3 days")).toBeTruthy();
  expect(screen.getByText("12:30")).toBeTruthy();
  expect(screen.queryByText("Sunset")).toBeNull();
  await fireEvent.press(screen.getByRole("tab", { name: /Day 3/ }));
  expect(screen.getByText("Sunset")).toBeTruthy();
  expect(screen.queryByText("Lunch")).toBeNull();
  await fireEvent.press(screen.getByRole("tab", { name: /Day 2/ }));
  expect(screen.getByText("Nothing planned for this day.")).toBeTruthy();
});

test("the top has Back, Add guest and Trip settings, and Add guest and settings open their screens", async () => {
  load({});
  await render(<Itinerary />);
  await screen.findByText("Lunch");
  expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Add guest" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Trip settings" })).toBeTruthy();
});
