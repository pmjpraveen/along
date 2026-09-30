import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import TripSettings from "../../app/trip/[id]/settings";

const mockLoad = jest.fn();
const mockDates = jest.fn();
const mockCurrency = jest.fn();
const mockPush = jest.fn();
jest.mock("../api/trips", () => ({
  loadTripSettings: (...a: unknown[]) => mockLoad(...a), updateTripDates: (...a: unknown[]) => mockDates(...a), setTripCurrency: (...a: unknown[]) => mockCurrency(...a),
}));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "t1" }), useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const settings = (o: object = {}) => ({ ok: true, settings: { start: "2026-12-01", end: "2026-12-05", currency: "INR", status: "published", hasMoney: false, isOwner: true,
  currencies: [{ code: "INR", name: "Indian rupee" }, { code: "USD", name: "US dollar" }], ...o } });
beforeEach(() => { jest.clearAllMocks(); mockLoad.mockResolvedValue(settings()); });

test("Trip settings has exactly three options: modify dates, currency and end trip, with the dates and currency shown", async () => {
  await render(<TripSettings />);
  expect(await screen.findByText("01-12-2026 → 05-12-2026")).toBeTruthy();
  expect(screen.getByText("INR")).toBeTruthy();
  expect(screen.getByRole("button", { name: /^Modify dates/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /^Currency/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /^End trip/ })).toBeTruthy();
});

test("End trip opens the review and confirm screen", async () => {
  await render(<TripSettings />);
  await fireEvent.press(await screen.findByRole("button", { name: /^End trip/ }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/complete", params: { id: "t1" } });
});

test("choosing a currency sends it once and reloads", async () => {
  mockCurrency.mockResolvedValue({ ok: true });
  await render(<TripSettings />);
  await fireEvent.press(await screen.findByRole("button", { name: /^Currency/ }));
  await fireEvent.press(await screen.findByRole("radio", { name: /US dollar/ }));
  await waitFor(() => expect(mockCurrency).toHaveBeenCalledWith("t1", "USD"));
  expect(mockCurrency).toHaveBeenCalledTimes(1);
});

test("once expenses exist the currency is locked and cannot be opened", async () => {
  mockLoad.mockResolvedValue(settings({ hasMoney: true }));
  await render(<TripSettings />);
  expect(await screen.findByText(/locked once expenses are added/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: /^Currency/ })).toBeNull();
  await fireEvent.press(screen.getByText("Currency"));
  expect(screen.queryByRole("radio", { name: /US dollar/ })).toBeNull();
});

test("a rejected currency change shows the reason", async () => {
  mockCurrency.mockResolvedValue({ ok: false, message: "The currency can't change once expenses have been added." });
  await render(<TripSettings />);
  await fireEvent.press(await screen.findByRole("button", { name: /^Currency/ }));
  await fireEvent.press(await screen.findByRole("radio", { name: /US dollar/ }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/can't change once expenses/);
});

test("a member who is not the owner, or a trip that has ended, cannot change anything", async () => {
  mockLoad.mockResolvedValueOnce(settings({ isOwner: false }));
  await render(<TripSettings />);
  expect(await screen.findByText(/Only the trip owner can change these/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: /^End trip/ })).toBeNull();
  await fireEvent.press(screen.getByText("End trip"));
  expect(mockPush).not.toHaveBeenCalled();
});

test("a load failure offers retry", async () => {
  mockLoad.mockResolvedValueOnce({ ok: false, message: "No connection." });
  await render(<TripSettings />);
  await fireEvent.press(await screen.findByRole("button", { name: "Retry" }));
  expect(await screen.findByText("INR")).toBeTruthy();
});
