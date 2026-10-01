import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import TripSettings from "../../app/trip/[id]/settings";

const mockLoad = jest.fn();
const mockDates = jest.fn();
const mockCurrency = jest.fn();
const mockDetails = jest.fn();
const mockColor = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("../api/trips", () => ({
  loadTripSettings: (...a: unknown[]) => mockLoad(...a), updateTripDates: (...a: unknown[]) => mockDates(...a), setTripCurrency: (...a: unknown[]) => mockCurrency(...a),
  updateTripDetails: (...a: unknown[]) => mockDetails(...a), setTripCardColor: (...a: unknown[]) => mockColor(...a),
}));
jest.mock("../hooks/usePlaceSearch", () => ({ usePlaceSearch: () => ({ places: [], busy: false, error: null }) }));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "t1" }), useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true, replace: mockReplace }),
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const settings = (o: object = {}) => ({ ok: true, settings: { id: "t1", version: 3, name: "Goa trip", destination: "Goa, India", description: "Fun travel", cardColor: null,
  start: "2026-12-01", end: "2026-12-05", currency: "INR", status: "published", hasMoney: false, isOwner: true,
  currencies: [{ code: "INR", name: "Indian rupee" }, { code: "USD", name: "US dollar" }], ...o } });
beforeEach(() => { jest.clearAllMocks(); mockLoad.mockResolvedValue(settings()); });

test("Trip details shows the trip's name and comment, its dates and currency, and the location, with no End trip or Delete trip", async () => {
  await render(<TripSettings />);
  expect(await screen.findByDisplayValue("Goa trip")).toBeTruthy();
  expect(screen.getByDisplayValue("Fun travel")).toBeTruthy();
  expect(screen.getByDisplayValue("Goa, India")).toBeTruthy();
  expect(screen.getByRole("button", { name: /^Trip dates, 1 Dec to 5 Dec/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /^Trip currency, INR/ })).toBeTruthy();
  expect(screen.queryByText("End trip")).toBeNull();
  expect(screen.queryByText("Delete trip")).toBeNull();
});

test("Save changes is off until something changes, then saves the new text once with the version that was read, and reloads", async () => {
  mockDetails.mockResolvedValue({ ok: true });
  await render(<TripSettings />);
  const save = await screen.findByRole("button", { name: "Save changes" });
  expect(save.props.accessibilityState).toMatchObject({ disabled: true });
  await fireEvent.changeText(screen.getByDisplayValue("Goa trip"), "Goa gang");
  await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(mockDetails).toHaveBeenCalledWith("t1", 3, { name: "Goa gang", destination: "Goa, India", description: "Fun travel" }));
  expect(mockDetails).toHaveBeenCalledTimes(1);
  expect(mockColor).not.toHaveBeenCalled();
  await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(2));
});

test("picking a card colour and saving sends just the colour", async () => {
  mockColor.mockResolvedValue({ ok: true });
  await render(<TripSettings />);
  await fireEvent.press(await screen.findByRole("radio", { name: "Colour 2" }));
  expect(screen.getByRole("radio", { name: "Colour 2" }).props.accessibilityState).toMatchObject({ selected: true });
  await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(mockColor).toHaveBeenCalledWith("t1", 1));
  expect(mockDetails).not.toHaveBeenCalled();
});

test("a blank name is not sent, and says what to do", async () => {
  await render(<TripSettings />);
  await fireEvent.changeText(await screen.findByDisplayValue("Goa trip"), "   ");
  await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByText("Give the trip a name.")).toBeTruthy();
  expect(mockDetails).not.toHaveBeenCalled();
});

test("a stale version is refused with a message, and nothing else is sent", async () => {
  mockDetails.mockResolvedValue({ ok: false, message: "Someone else changed this trip. Go back and open it again to see their changes." });
  await render(<TripSettings />);
  await fireEvent.changeText(await screen.findByDisplayValue("Goa trip"), "Goa gang");
  await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/Someone else changed this trip/);
  expect(mockColor).not.toHaveBeenCalled();
});

test("choosing a currency sends it once and reloads", async () => {
  mockCurrency.mockResolvedValue({ ok: true });
  await render(<TripSettings />);
  await fireEvent.press(await screen.findByRole("button", { name: /^Trip currency/ }));
  await fireEvent.press(await screen.findByRole("radio", { name: /US dollar/ }));
  await waitFor(() => expect(mockCurrency).toHaveBeenCalledWith("t1", "USD"));
  expect(mockCurrency).toHaveBeenCalledTimes(1);
});

test("once expenses exist the currency is locked and cannot be opened", async () => {
  mockLoad.mockResolvedValue(settings({ hasMoney: true }));
  await render(<TripSettings />);
  expect(await screen.findByText(/Locked once expenses are added/)).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: /^Trip currency/ }));
  expect(screen.queryByRole("radio", { name: /US dollar/ })).toBeNull();
});

test("a rejected currency change shows the reason", async () => {
  mockCurrency.mockResolvedValue({ ok: false, message: "The currency can't change once expenses have been added." });
  await render(<TripSettings />);
  await fireEvent.press(await screen.findByRole("button", { name: /^Trip currency/ }));
  await fireEvent.press(await screen.findByRole("radio", { name: /US dollar/ }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/can't change once expenses/);
});

test("a member who is not the owner can change nothing: no save, and fields and colours are locked", async () => {
  mockLoad.mockResolvedValueOnce(settings({ isOwner: false }));
  await render(<TripSettings />);
  expect(await screen.findByText(/Only the trip owner can change these/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
  expect(screen.getByDisplayValue("Goa trip").props.editable).toBe(false);
  expect(screen.getByRole("radio", { name: "Colour 1" }).props.accessibilityState).toMatchObject({ disabled: true });
});

test("a trip that has ended keeps its name and location locked but lets the owner still pick the card colour", async () => {
  mockLoad.mockResolvedValue(settings({ status: "completed" }));
  mockColor.mockResolvedValue({ ok: true });
  await render(<TripSettings />);
  expect(await screen.findByText(/This trip has ended, so its name and location are locked/)).toBeTruthy();
  expect(screen.getByDisplayValue("Goa trip").props.editable).toBe(false);
  await fireEvent.press(screen.getByRole("radio", { name: "Colour 4" }));
  await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(mockColor).toHaveBeenCalledWith("t1", 3));
  expect(mockDetails).not.toHaveBeenCalled();
});

test("a load failure offers retry", async () => {
  mockLoad.mockResolvedValueOnce({ ok: false, message: "No connection." });
  await render(<TripSettings />);
  await fireEvent.press(await screen.findByRole("button", { name: "Retry" }));
  expect(await screen.findByDisplayValue("Goa trip")).toBeTruthy();
});

