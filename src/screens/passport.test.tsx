import { fireEvent, render, screen } from "@testing-library/react-native";
import Passport from "../../app/passport";
import Summary from "../../app/trip/[id]/summary";

const mockStamps = jest.fn();
const mockSummary = jest.fn();
const mockPush = jest.fn();
jest.mock("../api/passport", () => ({ loadStamps: (...a: unknown[]) => mockStamps(...a), loadTripSummary: (...a: unknown[]) => mockSummary(...a) }));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "t1" }), useRouter: () => ({ push: mockPush }),
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const stamp = (id: string, dest: string, start: string, end: string) => ({ id, trip_id: `trip-${id}`, destination_name: dest, start_date: start, end_date: end, awarded_at: "x" });
beforeEach(() => jest.clearAllMocks());

test("7.4 the passport shows a stamp per completed trip, in the order given, with destination in caps and DD-MM-YYYY dates", async () => {
  mockStamps.mockResolvedValue({ ok: true, stamps: [stamp("b", "Lisbon", "2026-06-10", "2026-06-14"), stamp("a", "Goa, India", "2025-12-01", "2025-12-05")] });
  await render(<Passport />);
  expect(await screen.findByText("LISBON")).toBeTruthy();
  expect(screen.getByText("GOA, INDIA")).toBeTruthy();
  expect(screen.getByText("10-06-2026 → 14-06-2026")).toBeTruthy();
  const stamps = screen.getAllByRole("button");
  expect(stamps.map((b) => b.props.accessibilityLabel)).toEqual(["Lisbon, 10-06-2026 → 14-06-2026", "Goa, India, 01-12-2025 → 05-12-2025"]);
});

test("7.4 tapping a stamp opens that trip's summary", async () => {
  mockStamps.mockResolvedValue({ ok: true, stamps: [stamp("a", "Goa, India", "2025-12-01", "2025-12-05")] });
  await render(<Passport />);
  await fireEvent.press(await screen.findByRole("button", { name: /Goa, India/ }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/summary", params: { id: "trip-a" } });
});

test("7.4 a one-day trip shows a single date", async () => {
  mockStamps.mockResolvedValue({ ok: true, stamps: [stamp("a", "Ooty", "2026-05-07", "2026-05-07")] });
  await render(<Passport />);
  expect(await screen.findByText("07-05-2026")).toBeTruthy();
});

test("7.4 an empty passport says how to earn a stamp; a failure offers retry", async () => {
  mockStamps.mockResolvedValueOnce({ ok: true, stamps: [] });
  await render(<Passport />);
  expect(await screen.findByText(/No stamps yet/)).toBeTruthy();
  mockStamps.mockResolvedValueOnce({ ok: false, message: "No connection. Check your internet and try again." });
  await render(<Passport />);
  expect(await screen.findByRole("button", { name: "Retry" })).toBeTruthy();
});

const summary = { trip_id: "t1", name: "Goa 2025", destination_name: "Goa, India", start_date: "2025-12-01", end_date: "2025-12-05", status: "completed",
  currency: "INR", exponent: 2, people: 4, activities: 6, total_spend_minor: 1234500, outstanding_minor: 45000 };

test("7.4 the trip summary shows people, activities, total spend and what is still to settle", async () => {
  mockSummary.mockResolvedValue({ ok: true, summary });
  await render(<Summary />);
  expect(await screen.findByText("Goa, India")).toBeTruthy();
  expect(screen.getByText("4 people")).toBeTruthy();
  expect(screen.getByText("6 activities planned")).toBeTruthy();
  expect(screen.getByText("₹12,345.00")).toBeTruthy();
  expect(screen.getByText("₹450.00 still to settle")).toBeTruthy();
});

test("7.4 a fully settled trip says so, and the summary links to memories", async () => {
  mockSummary.mockResolvedValue({ ok: true, summary: { ...summary, outstanding_minor: 0, people: 1, activities: 1 } });
  await render(<Summary />);
  expect(await screen.findByText("Everyone is settled up.")).toBeTruthy();
  expect(screen.getByText("1 person")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Memories" }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/memories", params: { id: "t1" } });
});

test("7.4 a summary that cannot be loaded explains why", async () => {
  mockSummary.mockResolvedValue({ ok: false, message: "This trip isn't available to you any more." });
  await render(<Summary />);
  expect(await screen.findByRole("alert")).toHaveTextContent(/isn't available/);
});
