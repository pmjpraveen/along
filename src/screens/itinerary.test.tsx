import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Itinerary from "../../app/trip/[id]/itinerary";

const mockLoad = jest.fn();
const mockMove = jest.fn();
jest.mock("../api/itinerary", () => ({ loadItinerary: (...a: unknown[]) => mockLoad(...a), moveItem: (...a: unknown[]) => mockMove(...a) }));
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
  useLocalSearchParams: () => ({ id: "t1" }), useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const base = {
  id: "i1", version: 1, title: "Lunch", type: "restaurant", day_date: "2026-12-02", start_time: null, end_time: null, sort_order: 0,
  is_outside_trip_range: false, participants: [], location_text: null, location_url: null, latitude: null, longitude: null, formatted_address: null,
};
beforeEach(() => { mockLoad.mockReset(); mockMove.mockReset(); });
const load = (item: object) => mockLoad.mockResolvedValue({ ok: true, trip: { name: "Goa", start_date: "2026-12-01", end_date: "2026-12-05" }, items: [{ ...base, ...item }] });

test("3.4 plain text location displays exactly as typed with no map preview", async () => {
  load({ location_text: "Fish Curry Place, Goa" });
  await render(<Itinerary />);
  expect(await screen.findByText("📍 Fish Curry Place, Goa")).toBeTruthy();
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
  expect(await screen.findByText("📍 https://maps.app.goo.gl/zzz")).toBeTruthy();
  expect(screen.queryByText("MAP PREVIEW")).toBeNull();
});

test("3.5 moving an item sends the new day with the version I saw, then reloads the timeline", async () => {
  load({ version: 3 });
  mockMove.mockResolvedValue({ ok: true });
  await render(<Itinerary />);
  await fireEvent.press(await screen.findByRole("button", { name: "Move Lunch to another day" }));
  await fireEvent.press(screen.getByRole("button", { name: "New day for Lunch" }));
  await waitFor(() => expect(mockMove).toHaveBeenCalledWith("i1", "2026-12-04", 3));
  await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(2));
});

test("3.5 a rejected move shows the reason and reloads so the user sees the current state", async () => {
  load({});
  mockMove.mockResolvedValue({ ok: false, stale: true, message: "Someone else just changed this item. It's been refreshed. Try again." });
  await render(<Itinerary />);
  await fireEvent.press(await screen.findByRole("button", { name: "Move Lunch to another day" }));
  await fireEvent.press(screen.getByRole("button", { name: "New day for Lunch" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/Someone else just changed/);
  expect(mockLoad).toHaveBeenCalledTimes(2);
});
