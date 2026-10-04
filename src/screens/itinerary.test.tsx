import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useToast } from "../stores/toast";
import Itinerary from "../../app/trip/[id]/(tabs)/index";

const mockLoad = jest.fn();
const mockMove = jest.fn();
const mockDelete = jest.fn();
const mockPush = jest.fn();
const mockRestore = jest.fn();
jest.mock("../api/itinerary", () => ({ loadItinerary: (...a: unknown[]) => mockLoad(...a), moveItem: (...a: unknown[]) => mockMove(...a), deleteItem: (...a: unknown[]) => mockDelete(...a), restoreItem: (...a: unknown[]) => mockRestore(...a) }));
let mockRole: "owner" | "member" = "owner";
jest.mock("../api/members", () => ({ listMembers: async () => ({ ok: true, members: [{ id: "m1", display_name: "Asha", membership_type: "registered", role: mockRole, isMe: true }] }) }));
jest.mock("../api/invites", () => ({ createInviteLink: jest.fn() }));
jest.mock("../api/trips", () => ({ loadTripSettings: jest.fn(), loadTripStatus: async () => ({ ok: true, status: "published", completedAt: null, name: "Goa", destination: "Goa", coverUrl: null, cardColor: 0 }) }));
jest.mock("../components/DateField", () => ({
  DateField: ({ label, onChange, min, max }: { label: string; onChange: (d: string) => void; min?: string; max?: string }) => {
    const { Pressable, Text } = require("react-native");
    return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => onChange("2026-12-04")}><Text>{`pick ${min}..${max}`}</Text></Pressable>;
  },
}));
jest.mock("../components/MapPreview", () => ({
  MapPreview: () => { const { Text } = require("react-native"); return <Text>MAP PREVIEW</Text>; },
}));
jest.mock("expo-router", () => ({
  useGlobalSearchParams: () => ({ id: "t1" }), useLocalSearchParams: () => ({ id: "t1" }), useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const base = {
  id: "i1", version: 1, title: "Lunch", type: "restaurant", day_date: "2026-12-01", start_time: null, end_time: null, sort_order: 0,
  is_outside_trip_range: false, participants: [], location_text: null, location_url: null, latitude: null, longitude: null, formatted_address: null,
};
beforeEach(() => { mockLoad.mockReset(); mockMove.mockReset(); mockRole = "owner"; });
const load = (item: object) => mockLoad.mockResolvedValue({ ok: true, trip: { name: "Goa", start_date: "2026-12-01", end_date: "2026-12-05" }, items: [{ ...base, ...item }] });

test("3.4 plain text location displays exactly as typed with no map preview", async () => {
  load({ location_text: "Fish Curry Place, Goa" });
  await render(<Itinerary />);
  expect(await screen.findByText("Fish Curry Place, Goa")).toBeTruthy();
  expect(screen.queryByText("MAP PREVIEW")).toBeNull();
});

test("3.4 the message written when adding a plan shows on its card", async () => {
  load({ description: "Bring sunscreen" });
  await render(<Itinerary />);
  expect(await screen.findByText("Bring sunscreen")).toBeTruthy();
});

test("3.5 the day picker for moving a plan only offers the trip's own days", async () => {
  load({});
  await render(<Itinerary />);
  await fireEvent.press(await screen.findByRole("button", { name: "Options for Lunch" }));
  expect(await screen.findByText("pick 2026-12-01..2026-12-05")).toBeTruthy();
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

test("each plan card has a visible options button that opens the same panel as a long press", async () => {
  load({});
  await render(<Itinerary />);
  await fireEvent.press(await screen.findByRole("button", { name: "Options for Lunch" }));
  expect(screen.getByRole("button", { name: "Delete plan" })).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Options for Lunch" }));
  expect(screen.queryByRole("button", { name: "Delete plan" })).toBeNull();
});

test("Delete plan deletes at once with no confirmation, reloads, and the Plan deleted toast offers Undo, which brings the plan back", async () => {
  load({});
  mockDelete.mockResolvedValue({ ok: true });
  mockRestore.mockResolvedValue({ ok: true });
  await render(<Itinerary />);
  await fireEvent(await screen.findByRole("button", { name: "Lunch" }), "longPress");
  await fireEvent.press(screen.getByRole("button", { name: "Delete plan" }));
  await waitFor(() => expect(mockDelete).toHaveBeenCalledWith("i1"));
  expect(mockDelete).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(2));
  const t = useToast.getState();
  expect(t.message).toBe("Plan deleted");
  expect(t.action?.label).toBe("Undo");
  await act(async () => { t.action?.onPress(); });
  expect(mockRestore).toHaveBeenCalledWith("i1");
  await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(3));
});

test("a refused delete shows the reason and offers no Undo", async () => {
  load({});
  useToast.setState({ message: "", action: undefined });
  mockDelete.mockResolvedValue({ ok: false, message: "Only the person who added this plan or the trip owner can delete it." });
  await render(<Itinerary />);
  await fireEvent(await screen.findByRole("button", { name: "Lunch" }), "longPress");
  await fireEvent.press(screen.getByRole("button", { name: "Delete plan" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/Only the person who added/);
  expect(useToast.getState().action).toBeUndefined();
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
  expect(screen.getByText("Nothing planned for this day yet.")).toBeTruthy();
});

test("the top has Back, Guests and three dots that open the trip options: settings, share trip, end trip and delete trip for the owner", async () => {
  load({});
  await render(<Itinerary />);
  await screen.findByText("Lunch");
  expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Guests" })).toBeTruthy();
  expect(screen.queryByText("Trip options")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Trip options" }));
  expect(await screen.findByText("Trip options")).toBeTruthy();
  expect(screen.getByRole("button", { name: /^Trip settings/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /^Share trip/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /^End trip/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /^Delete trip/ })).toBeTruthy();
});

test("US-03 the options panel has an Edit button that opens the plan in the form", async () => {
  load({});
  await render(<Itinerary />);
  await fireEvent.press(await screen.findByRole("button", { name: "Options for Lunch" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Edit plan" }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/add-item", params: { id: "t1", itemId: "i1" } });
});

test("US-03 the options button shows on a plan I added, but not on someone else's, when I am not the owner", async () => {
  mockRole = "member";
  mockLoad.mockResolvedValue({ ok: true, trip: { name: "Goa", start_date: "2026-12-01", end_date: "2026-12-05" },
    items: [{ ...base, id: "mine", title: "My plan", created_by_member_id: "m1" }, { ...base, id: "theirs", title: "Their plan", created_by_member_id: "m2", sort_order: 1 }] });
  await render(<Itinerary />);
  expect(await screen.findByText("Their plan")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Options for My plan" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Options for Their plan" })).toBeNull();
});

test("US-03 the trip owner gets the options button on every plan", async () => {
  mockRole = "owner";
  mockLoad.mockResolvedValue({ ok: true, trip: { name: "Goa", start_date: "2026-12-01", end_date: "2026-12-05" },
    items: [{ ...base, id: "mine", title: "My plan", created_by_member_id: "m1" }, { ...base, id: "theirs", title: "Their plan", created_by_member_id: "m2", sort_order: 1 }] });
  await render(<Itinerary />);
  expect(await screen.findByRole("button", { name: "Options for Their plan" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Options for My plan" })).toBeTruthy();
});

test("US-03 a member cannot open the panel on someone else's plan by long press either", async () => {
  mockRole = "member";
  mockLoad.mockResolvedValue({ ok: true, trip: { name: "Goa", start_date: "2026-12-01", end_date: "2026-12-05" }, items: [{ ...base, title: "Their plan", created_by_member_id: "m2" }] });
  await render(<Itinerary />);
  await fireEvent(await screen.findByRole("button", { name: "Their plan" }), "longPress");
  expect(screen.queryByRole("button", { name: "Edit plan" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Delete plan" })).toBeNull();
});

test("US-02 tapping the people circles in the trip header opens the participants list", async () => {
  load({});
  await render(<Itinerary />);
  await fireEvent.press(await screen.findByRole("button", { name: "1 person" }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/guests", params: { id: "t1" } });
});
