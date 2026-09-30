import { act, render, screen, waitFor } from "@testing-library/react-native";
import History from "../../app/trip/[id]/(tabs)/activity";

const mockLoad = jest.fn();
const mockSeen = jest.fn();
const mockMark = jest.fn();
let mockReload: (() => void) | undefined;
jest.mock("../api/feed", () => ({
  loadFeed: (...a: unknown[]) => mockLoad(...a), lastSeen: (...a: unknown[]) => mockSeen(...a), markSeen: (...a: unknown[]) => mockMark(...a),
}));
jest.mock("../hooks/useTripRealtime", () => ({ useTripRealtime: (_i: string, _t: string[], reload: () => void) => { mockReload = reload; } }));
jest.mock("expo-router", () => ({
  useGlobalSearchParams: () => ({ id: "t1" }), useLocalSearchParams: () => ({ id: "t1" }), useRouter: () => ({ back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const at = (h: number) => new Date(2026, 11, 2, h, 0).toISOString();
const events = [
  { id: "e3", entity_type: "expense", action: "created", actor: "Ben", created_at: at(12), summary: { title: "Dinner", amount_minor: 90000, currency: "INR", exponent: 2, paid_by: "Ben" } },
  { id: "e2", entity_type: "itinerary_item", action: "created", actor: "Asha", created_at: at(11), summary: { title: "Beach day", day: "2026-12-03" } },
  { id: "e1", entity_type: "member", action: "joined", actor: "Ben", created_at: at(10), summary: { name: "Ben" } },
];
beforeEach(() => { jest.clearAllMocks(); mockLoad.mockResolvedValue({ ok: true, events }); mockSeen.mockResolvedValue(null); });

test("6.5 the feed lists joins, plans and expenses, newest first, in plain words with the time", async () => {
  await render(<History />);
  const rows = await screen.findAllByLabelText(/added Dinner|added Beach day|joined the trip/);
  expect(rows.map((r) => r.props.accessibilityLabel)).toEqual([
    expect.stringMatching(/^Ben added Dinner · ₹900.00, paid by Ben, 12:00 PM$/),
    expect.stringMatching(/^Asha added Beach day to the plan for 3 Dec, 11:00 AM$/),
    expect.stringMatching(/^Ben joined the trip, 10:00 AM$/),
  ]);
});

test("6.5 a first visit marks nothing as new, and remembers the newest entry for next time", async () => {
  await render(<History />);
  await screen.findByLabelText(/added Dinner/);
  expect(screen.queryByText("New")).toBeNull();
  await waitFor(() => expect(mockMark).toHaveBeenCalledWith("t1", at(12)));
});

test("6.5 entries since the last visit are marked New", async () => {
  mockSeen.mockResolvedValue(at(10));
  await render(<History />);
  expect(await screen.findByLabelText(/^New\. Ben added Dinner/)).toBeTruthy();
  expect(screen.getByLabelText(/^New\. Asha added Beach day/)).toBeTruthy();
  expect(screen.queryByLabelText(/^New\. Ben joined/)).toBeNull();
});

test("6.5 the markers from the start of the visit stay while new entries arrive live", async () => {
  mockSeen.mockResolvedValue(at(11));
  await render(<History />);
  await screen.findByLabelText(/^New\. Ben added Dinner/);
  mockLoad.mockResolvedValue({ ok: true, events: [{ ...events[0], id: "e4", created_at: at(13), summary: { ...events[0].summary, title: "Taxi" } }, ...events] });
  await act(async () => { mockReload?.(); });
  expect(await screen.findByLabelText(/^New\. Ben added Taxi/)).toBeTruthy();
  expect(screen.getByLabelText(/^New\. Ben added Dinner/)).toBeTruthy();
  expect(mockSeen).toHaveBeenCalledTimes(1);
});

test("6.5 an empty feed says what will appear", async () => {
  mockLoad.mockResolvedValue({ ok: true, events: [] });
  await render(<History />);
  expect(await screen.findByText(/Nothing yet/)).toBeTruthy();
  expect(mockMark).not.toHaveBeenCalled();
});

test("6.5 a load failure shows retry", async () => {
  mockLoad.mockResolvedValueOnce({ ok: false, message: "No connection. Check your internet and try again." });
  await render(<History />);
  expect(await screen.findByRole("alert")).toHaveTextContent(/No connection/);
  expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
});
