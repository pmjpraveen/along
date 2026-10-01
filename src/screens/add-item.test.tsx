import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import AddItem from "../../app/trip/[id]/add-item";

const mockCreate = jest.fn();
const mockBack = jest.fn();
jest.mock("../api/location", () => ({ resolveLocation: async (t: string) => t.includes("google") ? { text: t, url: t, place: { lat: 1, lng: 2, name: "Spot" } } : { text: t, url: null, place: null } }));
jest.mock("../components/MapPreview", () => ({ MapPreview: () => null }));
jest.mock("../api/itinerary", () => ({ createItem: (...a: unknown[]) => mockCreate(...a),
  loadItinerary: async () => ({ ok: true, trip: { name: "Goa", start_date: "2026-12-01", end_date: "2026-12-03" }, items: [] }) }));
jest.mock("../components/DateField", () => ({ DateField: () => null }));
jest.mock("../components/TimeField", () => ({ TimeField: () => null }));
let mockDay: string | undefined = "2026-12-02";
jest.mock("expo-router", () => ({ useLocalSearchParams: () => ({ id: "t1", day: mockDay }), useRouter: () => ({ back: mockBack }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
beforeEach(() => { jest.clearAllMocks(); mockDay = "2026-12-02"; });

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
