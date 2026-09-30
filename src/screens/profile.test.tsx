import { fireEvent, render, screen } from "@testing-library/react-native";
import Profile from "../../app/profile";
import Passport from "../../app/passport";
import Summary from "../../app/trip/[id]/summary";

const mockStamps = jest.fn();
const mockSummary = jest.fn();
const mockPush = jest.fn();
const mockCountry = jest.fn();
const mockSignOut = jest.fn();
const mockDelete = jest.fn();
const mockPref = jest.fn();
jest.mock("../api/profile", () => ({
  ...{},
  loadMyProfile: async () => ({ name: "Asha", email: "asha@along.test", since: "2026-09-29", country: "IN" }),
  setMyCountry: (...a: unknown[]) => mockCountry(...a), signOut: (...a: unknown[]) => mockSignOut(...a), deleteMyAccount: (...a: unknown[]) => mockDelete(...a),
}));
jest.mock("../api/notifications", () => ({
  loadPreferences: async () => ({ ok: true, enabled: { trip_invitation: true, itinerary_change: true, new_expense: false, balance_change: true, settlement_update: true } }),
  setPreference: (...a: unknown[]) => mockPref(...a),
}));
jest.mock("../api/passport", () => ({ loadStamps: (...a: unknown[]) => mockStamps(...a), loadTripSummary: (...a: unknown[]) => mockSummary(...a) }));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "t1" }), useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const stamp = (id: string, dest: string, start: string, end: string) => ({ id, trip_id: `trip-${id}`, destination_name: dest, start_date: start, end_date: end, awarded_at: "x" });
beforeEach(() => jest.clearAllMocks());

test("7.4 the passport shows a stamp per completed trip, in the order given, with destination in caps and DD-MM-YYYY dates", async () => {
  mockStamps.mockResolvedValue({ ok: true, stamps: [stamp("b", "Lisbon", "2026-06-10", "2026-06-14"), stamp("a", "Goa, India", "2025-12-01", "2025-12-05")] });
  await render(<Passport />);
  expect(await screen.findByLabelText("Lisbon, arrival 10 JUN 2026")).toBeTruthy();
  expect(screen.getByLabelText("Lisbon, departure 14 JUN 2026")).toBeTruthy();
  expect(screen.getByLabelText("Goa, India, arrival 01 DEC 2025")).toBeTruthy();
  expect(screen.getByLabelText("Goa, India, departure 05 DEC 2025")).toBeTruthy();
  const labels = screen.getAllByRole("button").map((x) => String(x.props.accessibilityLabel)).filter((l) => / (arrival|departure) /.test(l));
  expect(labels).toEqual(["Lisbon, departure 14 JUN 2026", "Lisbon, arrival 10 JUN 2026", "Goa, India, departure 05 DEC 2025", "Goa, India, arrival 01 DEC 2025"]);
});

test("7.4 tapping a stamp opens that trip's summary", async () => {
  mockStamps.mockResolvedValue({ ok: true, stamps: [stamp("a", "Goa, India", "2025-12-01", "2025-12-05")] });
  await render(<Passport />);
  await fireEvent.press(await screen.findByRole("button", { name: /Goa, India, arrival/ }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/summary", params: { id: "trip-a" } });
});

test("7.4 a one-day trip shows a single date", async () => {
  mockStamps.mockResolvedValue({ ok: true, stamps: [stamp("a", "Ooty", "2026-05-07", "2026-05-07")] });
  await render(<Passport />);
  expect(await screen.findByLabelText("Ooty, arrival 07 MAY 2026")).toBeTruthy();
});

test("7.4 an empty passport shows zero trips, and its page says how to earn a stamp; a failure offers retry", async () => {
  mockStamps.mockResolvedValueOnce({ ok: true, stamps: [] });
  await render(<Profile />);
  expect(await screen.findByLabelText("Passport, total trips 0")).toBeTruthy();
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
  await fireEvent.press(screen.getByRole("button", { name: /^Memories/ }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/memories", params: { id: "t1" } });
});

test("7.4 a summary that cannot be loaded explains why", async () => {
  mockSummary.mockResolvedValue({ ok: false, message: "This trip isn't available to you any more." });
  await render(<Summary />);
  expect(await screen.findByRole("alert")).toHaveTextContent(/isn't available/);
});

test("the profile shows who I am and how many trips I have completed", async () => {
  mockStamps.mockResolvedValue({ ok: true, stamps: [stamp("a", "Goa, India", "2025-12-01", "2025-12-05"), stamp("b", "Lisbon", "2026-06-10", "2026-06-14")] });
  await render(<Profile />);
  expect(await screen.findByText("asha@along.test")).toBeTruthy();
  expect(screen.getByText("29-09-2026")).toBeTruthy();
  expect(screen.getByLabelText("Passport, total trips 2")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
});

test("Settings shows my country, and choosing another saves it once", async () => {
  mockStamps.mockResolvedValue({ ok: true, stamps: [] });
  mockCountry.mockResolvedValue({ ok: true });
  await render(<Profile />);
  expect(await screen.findByText("India")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: /^Country/ }));
  await fireEvent.press(await screen.findByRole("radio", { name: "Japan" }));
  expect(mockCountry).toHaveBeenCalledWith("JP");
  expect(mockCountry).toHaveBeenCalledTimes(1);
  expect(await screen.findByText("Japan")).toBeTruthy();
});

test("notification choices load, and switching one saves it; a failed save puts it back and says why", async () => {
  mockStamps.mockResolvedValue({ ok: true, stamps: [] });
  mockPref.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false, message: "Couldn't save your choice. Try again." });
  await render(<Profile />);
  await fireEvent.press(await screen.findByRole("button", { name: /^Notifications/ }));
  const expenses = await screen.findByRole("switch", { name: /New expenses/ });
  expect(expenses.props.value ?? expenses.props.accessibilityState?.checked).toBeFalsy();
  await fireEvent(screen.getByRole("switch", { name: /People joining/ }), "valueChange", false);
  expect(mockPref).toHaveBeenCalledWith("trip_invitation", false);
});

test("Log out signs out once", async () => {
  mockStamps.mockResolvedValue({ ok: true, stamps: [] });
  mockSignOut.mockResolvedValue({ ok: true });
  await render(<Profile />);
  await fireEvent.press(await screen.findByRole("button", { name: /^Log out/ }));
  expect(mockSignOut).toHaveBeenCalledTimes(1);
});

test("Delete account asks first, deletes only when confirmed, and says why when it is refused", async () => {
  mockStamps.mockResolvedValue({ ok: true, stamps: [] });
  mockDelete.mockResolvedValue({ ok: false, message: "You still own a trip that other people are on. End the trip first, then delete your account." });
  await render(<Profile />);
  await fireEvent.press(await screen.findByRole("button", { name: /^Delete account/ }));
  expect(mockDelete).not.toHaveBeenCalled();
  expect(await screen.findByText("Delete your account?")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Keep my account" }));
  expect(mockDelete).not.toHaveBeenCalled();
  await fireEvent.press(await screen.findByRole("button", { name: /^Delete account/ }));
  await fireEvent.press(await screen.findByRole("button", { name: "Delete account" }));
  expect(mockDelete).toHaveBeenCalledTimes(1);
  expect(await screen.findByRole("alert")).toHaveTextContent(/still own a trip/);
});

test("Privacy policy and Terms of use open their pages", async () => {
  mockStamps.mockResolvedValue({ ok: true, stamps: [] });
  await render(<Profile />);
  await fireEvent.press(await screen.findByRole("button", { name: "Privacy policy" }));
  expect(mockPush).toHaveBeenLastCalledWith("/privacy");
  await fireEvent.press(screen.getByRole("button", { name: "Terms of use" }));
  expect(mockPush).toHaveBeenLastCalledWith("/terms");
});

test("stamps are not on the profile; tapping the passport opens the passport page", async () => {
  mockStamps.mockResolvedValue({ ok: true, stamps: [stamp("a", "Goa, India", "2025-12-01", "2025-12-05")] });
  await render(<Profile />);
  const passport = await screen.findByRole("button", { name: /^Passport, total trips 1/ });
  expect(screen.queryByLabelText(/^Goa, India, /)).toBeNull();
  await fireEvent.press(passport);
  expect(mockPush).toHaveBeenLastCalledWith("/passport");
});

test("the passport prints my country's three-letter code on its machine-readable line", async () => {
  mockStamps.mockResolvedValue({ ok: true, stamps: [] });
  await render(<Profile />);
  expect(await screen.findByText(/^<<IND<<ASHA<<MEMBERSINCE29SEP26<<$/)).toBeTruthy();
});

test("a completed trip's summary carries a Completed badge and a back button, and opens balances and expenses", async () => {
  mockSummary.mockResolvedValue({ ok: true, summary });
  await render(<Summary />);
  expect(await screen.findByText("Completed")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: /^Balances/ }));
  expect(mockPush).toHaveBeenLastCalledWith({ pathname: "/trip/[id]/balances", params: { id: "t1" } });
  await fireEvent.press(screen.getByRole("button", { name: /^Expenses/ }));
  expect(mockPush).toHaveBeenLastCalledWith({ pathname: "/trip/[id]/expenses", params: { id: "t1" } });
});
