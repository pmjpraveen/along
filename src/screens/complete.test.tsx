import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Complete from "../../app/trip/[id]/complete";

const mockComplete = jest.fn();
const mockStamp = jest.fn();
const mockSummary = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock("../api/passport", () => ({ loadTripSummary: (...a: unknown[]) => mockSummary(...a) }));
jest.mock("../api/trips", () => ({ completeTrip: (...a: unknown[]) => mockComplete(...a), stampForTrip: (...a: unknown[]) => mockStamp(...a) }));
jest.mock("expo-router", () => ({ useLocalSearchParams: () => ({ id: "t1" }), useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => true }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
const summary = { trip_id: "t1", name: "Goa 2026", destination_name: "Goa, India", start_date: "2026-12-01", end_date: "2026-12-05", status: "published",
  currency: "INR", exponent: 2, people: 4, activities: 6, total_spend_minor: 1234500, outstanding_minor: 45000 };
beforeEach(() => { jest.clearAllMocks(); mockStamp.mockResolvedValue(null); mockSummary.mockResolvedValue({ ok: true, summary }); });
const ready = async () => screen.findByRole("button", { name: "Complete trip" });

test("7.1 nothing changes until the owner confirms, and backing out completes nothing", async () => {
  await render(<Complete />);
  await ready();
  expect(screen.getByText(/Nothing is deleted or locked/)).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Not yet" }));
  expect(mockBack).toHaveBeenCalled();
  expect(mockComplete).not.toHaveBeenCalled();
});

test("7.1 confirming completes the trip and reassures that everything is kept", async () => {
  mockComplete.mockResolvedValue({ ok: true });
  await render(<Complete />);
  await fireEvent.press(await ready());
  expect(await screen.findByText(/balances stay open until they're settled/)).toBeTruthy();
  expect(mockComplete).toHaveBeenCalledWith("t1");
  await fireEvent.press(screen.getByRole("button", { name: "Done" }));
  expect(mockBack).toHaveBeenCalled();
});

test("7.1 a rejection keeps the screen and can be retried; a double tap completes once", async () => {
  mockComplete.mockResolvedValueOnce({ ok: false, message: "Only the trip owner can complete this trip." }).mockResolvedValueOnce({ ok: true });
  await render(<Complete />);
  await ready();
  const button = () => screen.getByRole("button", { name: /Complete trip|Completing/ });
  await fireEvent.press(button());
  expect(await screen.findByText(/Only the trip owner/)).toBeTruthy();
  await fireEvent.press(button());
  await waitFor(() => expect(screen.getByText("Trip completed")).toBeTruthy());
  expect(mockComplete).toHaveBeenCalledTimes(2);
});

test("7.2 completing a trip that earned a stamp says so, once", async () => {
  mockComplete.mockResolvedValue({ ok: true });
  mockStamp.mockResolvedValue({ destination: "Goa, India" });
  await render(<Complete />);
  await fireEvent.press(await ready());
  expect(await screen.findByText("Passport stamp added: Goa, India")).toBeTruthy();
  expect(mockStamp).toHaveBeenCalledTimes(1);
  expect(mockStamp).toHaveBeenCalledWith("t1");
});

test("7.2 a completion that earned no stamp (the trip has not started) shows none", async () => {
  mockComplete.mockResolvedValue({ ok: true });
  await render(<Complete />);
  await fireEvent.press(await ready());
  await screen.findByText("Trip completed");
  await waitFor(() => expect(mockStamp).toHaveBeenCalled());
  expect(screen.queryByText(/Passport stamp added/)).toBeNull();
});

test("7.3 after completing, one tap goes straight to adding a photo while the trip is fresh", async () => {
  mockComplete.mockResolvedValue({ ok: true });
  await render(<Complete />);
  await fireEvent.press(await ready());
  await fireEvent.press(await screen.findByRole("button", { name: "Add a photo to Memories" }));
  expect(mockReplace).toHaveBeenCalledWith({ pathname: "/trip/[id]/memories", params: { id: "t1" } });
});

test("7.5 the owner sees people, activities, total spend and the outstanding balance before confirming", async () => {
  await render(<Complete />);
  expect(await screen.findByText("Goa, India · 01-12-2026 → 05-12-2026")).toBeTruthy();
  expect(screen.getByText("4 people")).toBeTruthy();
  expect(screen.getByText("6 activities planned")).toBeTruthy();
  expect(screen.getByText("₹12,345.00")).toBeTruthy();
  expect(screen.getByText("₹450.00 still to settle")).toBeTruthy();
  expect(mockComplete).not.toHaveBeenCalled();
});

test("7.5 the summary is shown before the confirm button is offered", async () => {
  let resolve!: (v: unknown) => void;
  mockSummary.mockReturnValue(new Promise((r) => { resolve = r; }));
  await render(<Complete />);
  expect(screen.queryByRole("button", { name: "Complete trip" })).toBeNull();
  expect(screen.getByLabelText("Loading trip summary")).toBeTruthy();
  resolve({ ok: true, summary });
  expect(await ready()).toBeTruthy();
});

test("7.5 when the summary cannot be loaded there is no confirm button, only retry", async () => {
  mockSummary.mockResolvedValueOnce({ ok: false, message: "No connection. Check your internet and try again." });
  await render(<Complete />);
  expect(await screen.findByRole("alert")).toHaveTextContent(/No connection/);
  expect(screen.queryByRole("button", { name: "Complete trip" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
  expect(await ready()).toBeTruthy();
});

test("7.5 a settled trip says so before confirming", async () => {
  mockSummary.mockResolvedValue({ ok: true, summary: { ...summary, outstanding_minor: 0 } });
  await render(<Complete />);
  expect(await screen.findByText("Everyone is settled up.")).toBeTruthy();
});
