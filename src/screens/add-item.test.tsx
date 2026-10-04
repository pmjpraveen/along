import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import AddItem from "../../app/trip/[id]/add-item";

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
let mockItems: object[] = [];
let mockItemId: string | undefined;
const mockBack = jest.fn();
jest.mock("../api/location", () => ({ resolveLocation: async (t: string) => t.includes("google") ? { text: t, url: t, place: { lat: 1, lng: 2, name: "Spot" } } : { text: t, url: null, place: null } }));
jest.mock("../components/MapPreview", () => ({ MapPreview: ({ place }: { place: { name: string } }) => { const { Text } = require("react-native"); return <Text>{`Map of ${place.name}`}</Text>; } }));
const mockSearch = jest.fn();
jest.mock("../api/placeSearch", () => ({ searchPlaces: (...a: unknown[]) => mockSearch(...a) }));
jest.mock("../api/itinerary", () => ({ createItem: (...a: unknown[]) => mockCreate(...a), updateItem: (...a: unknown[]) => mockUpdate(...a),
  loadItinerary: async () => ({ ok: true, trip: { name: "Goa", start_date: "2026-12-01", end_date: "2026-12-03" }, items: mockItems }) }));
jest.mock("../components/DateField", () => ({ DateField: () => null }));
jest.mock("../components/TimeField", () => ({ TimeField: () => null }));
let mockDay: string | undefined = "2026-12-02";
jest.mock("expo-router", () => ({ useLocalSearchParams: () => ({ id: "t1", day: mockDay, itemId: mockItemId }), useRouter: () => ({ back: mockBack }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
beforeEach(() => { jest.clearAllMocks(); mockDay = "2026-12-02"; mockItems = []; mockItemId = undefined; });

const save = async () => fireEvent.press(screen.getByRole("button", { name: "Save Plan" }));

test("US-03 a valid item saves with the default date and type, then closes", async () => {
  mockCreate.mockResolvedValue({ ok: true });
  await render(<AddItem />);
  await fireEvent.changeText(screen.getByLabelText("Plan name"), "Beach day");
  await save();
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockCreate).toHaveBeenCalledWith({ tripId: "t1", title: "Beach day", type: "activity", day: "2026-12-02", startTime: null, participantIds: [], description: "" });
});

test("US-03 a blank title shows an inline error and saves nothing", async () => {
  await render(<AddItem />);
  await save();
  expect(await screen.findByText(/Give this a title/)).toBeTruthy();
  expect(mockCreate).not.toHaveBeenCalled();
});

test("US-03 a failed save keeps the form and shows the reason", async () => {
  mockCreate.mockResolvedValue({ ok: false, message: "You're offline. Check your connection and try again." });
  await render(<AddItem />);
  await fireEvent.changeText(screen.getByLabelText("Plan name"), "Beach day");
  await save();
  expect(await screen.findByText(/You're offline/)).toBeTruthy();
  expect(screen.getByLabelText("Plan name").props.value).toBe("Beach day");
  expect(mockBack).not.toHaveBeenCalled();
});

test("the trip's days are chips, and choosing one saves the plan on that day with its message", async () => {
  mockCreate.mockResolvedValue({ ok: true });
  await render(<AddItem />);
  await fireEvent.changeText(screen.getByLabelText("Plan name"), "Dinner");
  await fireEvent.press(await screen.findByRole("tab", { name: "Day 3, 3 Dec" }));
  await fireEvent.changeText(screen.getByLabelText("Message"), "Bring cash");
  await save();
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockCreate.mock.calls[0][0]).toMatchObject({ day: "2026-12-03", description: "Bring cash" });
});

test("3.3 a pasted Maps link is resolved and saved with the item", async () => {
  mockCreate.mockResolvedValue({ ok: true });
  await render(<AddItem />);
  await fireEvent.changeText(screen.getByLabelText("Plan name"), "Dinner");
  await fireEvent.changeText(screen.getByLabelText("Location"), "https://www.google.com/maps/@1,2,15z");
  await save();
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockCreate.mock.calls[0][0].location.place).toEqual({ lat: 1, lng: 2, name: "Spot" });
});

test("3.4 typed place text is saved as-is with no place and shows no map preview", async () => {
  mockCreate.mockResolvedValue({ ok: true });
  await render(<AddItem />);
  await fireEvent.changeText(screen.getByLabelText("Plan name"), "Lunch");
  await fireEvent.changeText(screen.getByLabelText("Location"), "Fish Curry Place, Goa");
  await save();
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockCreate.mock.calls[0][0].location).toEqual({ text: "Fish Curry Place, Goa", url: null, place: null });
});

test("3.4 an item with no location sends none", async () => {
  mockCreate.mockResolvedValue({ ok: true });
  await render(<AddItem />);
  await fireEvent.changeText(screen.getByLabelText("Plan name"), "Nap");
  await save();
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockCreate.mock.calls[0][0].location).toBeUndefined();
});

test("with no day given, the trip's first day is selected", async () => {
  mockDay = undefined;
  mockCreate.mockResolvedValue({ ok: true });
  await render(<AddItem />);
  expect((await screen.findByRole("tab", { name: "Day 1, 1 Dec" })).props.accessibilityState.selected).toBe(true);
});

test("a place picked from the suggestions shows its map snippet, and the field losing focus afterwards does not remove it", async () => {
  jest.useFakeTimers();
  mockSearch.mockResolvedValue({ ok: true, places: [{ id: "1", title: "Baga Beach", subtitle: "Goa", lat: 15.55, lng: 73.75 }] });
  await render(<AddItem />);
  const field = screen.getByLabelText("Location");
  await fireEvent.changeText(field, "baga");
  await act(async () => { jest.advanceTimersByTime(600); });
  await fireEvent.press(await screen.findByText("Baga Beach"));
  await fireEvent(field, "endEditing");   // picking a suggestion blurs the field, which resolves the text now in it
  await act(async () => { jest.advanceTimersByTime(100); });
  expect(screen.getByText("Map of Baga Beach")).toBeTruthy();
  mockCreate.mockResolvedValue({ ok: true });
  await fireEvent.changeText(screen.getByLabelText("Plan name"), "Sunset");
  await save();
  await waitFor(() => expect(mockCreate).toHaveBeenCalled());
  // the plan is saved with the picked place's coordinates, so its card can show the map
  expect(mockCreate.mock.calls[0][0].location).toEqual({ text: "Baga Beach", url: null, place: { lat: 15.55, lng: 73.75, name: "Baga Beach" } });
  jest.useRealTimers();
});

test("US-03 the mic asks for permission, then starts listening for the message", async () => {
  const { ExpoSpeechRecognitionModule } = jest.requireMock("expo-speech-recognition");
  await render(<AddItem />);
  await fireEvent.press(screen.getByRole("button", { name: "Dictate message" }));
  await waitFor(() => expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledWith(expect.objectContaining({ interimResults: true })));
});

test("US-03 a refused microphone permission says how to allow it and starts nothing", async () => {
  const { ExpoSpeechRecognitionModule } = jest.requireMock("expo-speech-recognition");
  ExpoSpeechRecognitionModule.start.mockClear();
  ExpoSpeechRecognitionModule.requestPermissionsAsync = async () => ({ granted: false });
  await render(<AddItem />);
  await fireEvent.press(screen.getByRole("button", { name: "Dictate message" }));
  expect(await screen.findByText(/Allow the microphone/)).toBeTruthy();
  expect(ExpoSpeechRecognitionModule.start).not.toHaveBeenCalled();
});

const existing = { id: "i1", version: 3, title: "Beach", type: "activity", day_date: "2026-12-03", start_time: "10:00:00", end_time: null, sort_order: 0, is_outside_trip_range: false,
  participants: [], location_text: "Baga", location_url: null, latitude: 15.55, longitude: 73.75, formatted_address: "Baga Beach", description: "Bring sunscreen" };

test("US-03 editing a plan opens the form filled in, and Save sends every field with the version I saw", async () => {
  mockItems = [existing];
  mockItemId = "i1";
  mockUpdate.mockResolvedValue({ ok: true });
  await render(<AddItem />);
  expect(await screen.findByDisplayValue("Beach")).toBeTruthy();
  expect(screen.getByDisplayValue("Bring sunscreen")).toBeTruthy();
  expect(screen.getByText("Edit plan")).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText("Plan name"), "Beach sunset");
  await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockCreate).not.toHaveBeenCalled();
  expect(mockUpdate).toHaveBeenCalledWith({ id: "i1", version: 3, title: "Beach sunset", day: "2026-12-03", startTime: "10:00",
    location: { text: "Baga", url: null, place: { lat: 15.55, lng: 73.75, name: "Baga" } }, description: "Bring sunscreen" });
});

test("US-03 a plan that changed while I was editing is refused with a reason and the form keeps my changes", async () => {
  mockItems = [existing];
  mockItemId = "i1";
  mockUpdate.mockResolvedValue({ ok: false, stale: true, message: "Someone else just changed this plan. Go back to see the latest, then edit again." });
  await render(<AddItem />);
  await fireEvent.changeText(await screen.findByLabelText("Plan name"), "My edit");
  await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByText(/Someone else just changed this plan/)).toBeTruthy();
  expect(screen.getByDisplayValue("My edit")).toBeTruthy();
  expect(mockBack).not.toHaveBeenCalled();
});

test("US-03 editing a plan that is gone says so and does not save", async () => {
  mockItems = [];
  mockItemId = "gone";
  await render(<AddItem />);
  expect(await screen.findByText(/no longer there/)).toBeTruthy();
});
