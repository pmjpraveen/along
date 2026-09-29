import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Join from "../../app/join/[token]";
import { useSession } from "../stores/session";

const mockAccept = jest.fn();
const mockPreview = jest.fn();
const mockClaim = jest.fn();
const mockRouter = { replace: jest.fn(), push: jest.fn() };
jest.mock("../api/invites", () => ({ acceptInvite: (...a: unknown[]) => mockAccept(...a), previewInvite: (...a: unknown[]) => mockPreview(...a), claimGuestProfile: (...a: unknown[]) => mockClaim(...a) }));
jest.mock("../api/supabase", () => ({ supabase: {} }));
jest.mock("expo-router", () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => ({ token: "abc" }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
const trip = { name: "Goa", destination: "Goa, India", start_date: "2026-12-01", end_date: "2026-12-05", participant_count: 3 };
beforeEach(() => { jest.clearAllMocks(); mockPreview.mockResolvedValue({ ok: true, preview: trip }); useSession.setState({ status: "in", pendingInvite: null }); });

test("US-16 a signed-in recipient joins and lands on the trip", async () => {
  mockAccept.mockResolvedValue({ ok: true, tripId: "t1" });
  await render(<Join />);
  await fireEvent.press(await screen.findByRole("button", { name: "Join trip" }));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: "/trip/[id]", params: { id: "t1" } }));
  expect(mockAccept).toHaveBeenCalledWith("abc");
});

test("US-16 a signed-out recipient keeps the invite through sign-in", async () => {
  useSession.setState({ status: "out" });
  await render(<Join />);
  expect(useSession.getState().pendingInvite).toBe("abc");
  await fireEvent.press(await screen.findByRole("button", { name: "Sign in to join" }));
  expect(mockRouter.push).toHaveBeenCalledWith("/sign-in");
  expect(mockAccept).not.toHaveBeenCalled();
});

test("US-16 an expired invite shows the reason and does not navigate", async () => {
  mockAccept.mockResolvedValue({ ok: false, message: "This invite link has expired. Ask the organizer for a new one." });
  await render(<Join />);
  await fireEvent.press(await screen.findByRole("button", { name: "Join trip" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/expired/);
  expect(mockRouter.replace).not.toHaveBeenCalled();
});

test("US-16b the preview shows name, destination, dates as DD-MM-YYYY and headcount before sign-in", async () => {
  useSession.setState({ status: "out" });
  await render(<Join />);
  expect(await screen.findByText("Goa")).toBeTruthy();
  expect(screen.getByText("Goa, India")).toBeTruthy();
  expect(screen.getByText("01-12-2026 → 05-12-2026")).toBeTruthy();
  expect(screen.getByText("3 people going")).toBeTruthy();
});

test("US-16b an invalid invite shows the reason with no join button", async () => {
  mockPreview.mockResolvedValue({ ok: false, message: "This invite link has expired. Ask the organizer for a new one." });
  await render(<Join />);
  expect(await screen.findByRole("alert")).toHaveTextContent(/expired/);
  expect(screen.queryByRole("button", { name: "Join trip" })).toBeNull();
});

test("US-17 a claim link asks who you are, confirms, and claims instead of joining", async () => {
  mockPreview.mockResolvedValue({ ok: true, preview: { ...trip, claims_name: "Rahul" } });
  mockClaim.mockResolvedValue({ ok: true, tripId: "t1" });
  await render(<Join />);
  expect(await screen.findByText(/Are you Rahul\?/)).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Yes, that's me" }));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalled());
  expect(mockClaim).toHaveBeenCalledWith("abc");
  expect(mockAccept).not.toHaveBeenCalled();
});

test("US-17 a claim conflict shows the reason and does not navigate", async () => {
  mockPreview.mockResolvedValue({ ok: true, preview: { ...trip, claims_name: "Rahul" } });
  mockClaim.mockResolvedValue({ ok: false, message: "You're already in this trip under another name. Ask the organizer to check." });
  await render(<Join />);
  await fireEvent.press(await screen.findByRole("button", { name: "Yes, that's me" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/already in this trip/);
  expect(mockRouter.replace).not.toHaveBeenCalled();
});
