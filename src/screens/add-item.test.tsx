import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import AddItem from "../../app/trip/[id]/add-item";

const mockCreate = jest.fn();
const mockBack = jest.fn();
jest.mock("../api/location", () => ({ resolveLocation: async (t: string) => t.includes("google") ? { text: t, url: t, place: { lat: 1, lng: 2, name: "Spot" } } : { text: t, url: null, place: null } }));
jest.mock("../components/MapPreview", () => ({ MapPreview: () => null }));
jest.mock("../api/itinerary", () => ({ createItem: (...a: unknown[]) => mockCreate(...a) }));
jest.mock("../api/members", () => ({ listMembers: async () => ({ ok: true, members: [
  { id: "m1", display_name: "Asha", membership_type: "registered", role: "owner" },
  { id: "m2", display_name: "Rahul", membership_type: "guest", role: "guest" } ] }) }));
jest.mock("../components/DateField", () => ({ DateField: () => null }));
jest.mock("../components/TimeField", () => ({ TimeField: () => null }));
jest.mock("expo-router", () => ({ useLocalSearchParams: () => ({ id: "t1", day: "2026-12-02" }), useRouter: () => ({ back: mockBack }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
beforeEach(() => jest.clearAllMocks());

const save = async () => fireEvent.press(screen.getByRole("button", { name: "Save" }));

test("US-03 a valid item saves with the default date and type, then closes", async () => {
  mockCreate.mockResolvedValue({ ok: true });
  await render(<AddItem />);
  await fireEvent.changeText(screen.getByLabelText("Title"), "Beach day");
  await save();
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockCreate).toHaveBeenCalledWith({ tripId: "t1", title: "Beach day", type: "activity", day: "2026-12-02", startTime: null, participantIds: [] });
});

test("US-03 a blank title shows an inline error and saves nothing", async () => {
  await render(<AddItem />);
  await save();
  expect(await screen.findByText(/Give this a title/)).toBeTruthy();
  expect(mockCreate).not.toHaveBeenCalled();
});

test("US-03 a failed save keeps the form and shows the reason", async () => {
  mockCreate.mockResolvedValue({ ok: false, message: "No connection. Check your internet and try again." });
  await render(<AddItem />);
  await fireEvent.changeText(screen.getByLabelText("Title"), "Beach day");
  await fireEvent.press(screen.getByRole("radio", { name: "Food" }));
  await save();
  expect(await screen.findByText(/No connection/)).toBeTruthy();
  expect(screen.getByLabelText("Title").props.value).toBe("Beach day");
  expect(mockBack).not.toHaveBeenCalled();
});

test("US-04 only the people I tick are sent as participants", async () => {
  mockCreate.mockResolvedValue({ ok: true });
  await render(<AddItem />);
  await fireEvent.changeText(screen.getByLabelText("Title"), "Dinner");
  await fireEvent.press(await screen.findByRole("checkbox", { name: "Rahul, guest" }));
  await save();
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockCreate.mock.calls[0][0].participantIds).toEqual(["m2"]);
});

test("3.3 a pasted Maps link is resolved and saved with the item", async () => {
  mockCreate.mockResolvedValue({ ok: true });
  await render(<AddItem />);
  await fireEvent.changeText(screen.getByLabelText("Title"), "Dinner");
  await fireEvent.changeText(screen.getByLabelText("Location"), "https://www.google.com/maps/@1,2,15z");
  await save();
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockCreate.mock.calls[0][0].location.place).toEqual({ lat: 1, lng: 2, name: "Spot" });
});

test("3.4 typed place text is saved as-is with no place and shows no map preview", async () => {
  mockCreate.mockResolvedValue({ ok: true });
  await render(<AddItem />);
  await fireEvent.changeText(screen.getByLabelText("Title"), "Lunch");
  await fireEvent.changeText(screen.getByLabelText("Location"), "Fish Curry Place, Goa");
  await save();
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockCreate.mock.calls[0][0].location).toEqual({ text: "Fish Curry Place, Goa", url: null, place: null });
});

test("3.4 an item with no location sends none", async () => {
  mockCreate.mockResolvedValue({ ok: true });
  await render(<AddItem />);
  await fireEvent.changeText(screen.getByLabelText("Title"), "Nap");
  await save();
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockCreate.mock.calls[0][0].location).toBeUndefined();
});
