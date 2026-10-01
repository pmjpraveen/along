import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Share } from "react-native";
import Guests from "../../app/trip/[id]/guests";

const mockMembers = jest.fn();
const mockInvite = jest.fn();
const mockPush = jest.fn();
jest.mock("../api/members", () => ({ listMembers: (...a: unknown[]) => mockMembers(...a) }));
jest.mock("../api/invites", () => ({ createInviteLink: (...a: unknown[]) => mockInvite(...a) }));
jest.mock("../api/trips", () => ({ loadTripSettings: async () => ({ ok: true, settings: { name: "Goa trip", start: "2026-12-01", end: "2026-12-05" } }) }));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "t1" }), useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const m = (id: string, display_name: string, membership_type: string, role: string, isMe = false) => ({ id, display_name, membership_type, role, isMe });
beforeEach(() => {
  jest.clearAllMocks();
  mockMembers.mockResolvedValue({ ok: true, members: [m("a", "Asha", "registered", "owner", true), m("g1", "Rahul", "guest", "guest"), m("g2", "Meera", "guest", "guest")] });
});

test("US-03 Guests lists only guests, with Invite on each and an Add guest button for the owner", async () => {
  await render(<Guests />);
  expect(await screen.findByText("Rahul")).toBeTruthy();
  expect(screen.getByText("Meera")).toBeTruthy();
  expect(screen.queryByText("Asha")).toBeNull();
  expect(screen.getAllByRole("button", { name: "Invite" })).toHaveLength(2);
  await fireEvent.press(screen.getByRole("button", { name: "Add guest" }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/add-guest", params: { id: "t1" } });
});

test("US-03 Invite makes a claim link for that guest and shares a personal message", async () => {
  mockInvite.mockResolvedValue({ ok: true, url: "along://join/tok", token: "tok" });
  const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as never);
  await render(<Guests />);
  await fireEvent.press((await screen.findAllByRole("button", { name: "Invite" }))[0]);
  await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
  expect(mockInvite).toHaveBeenCalledWith("t1", "g1");
  const { message } = share.mock.calls[0][0] as { message: string };
  expect(message).toContain("Hi Rahul!");
  expect(message).toContain("🗓️ 5 days");
  expect(message).toContain("/join/tok");
});

test("US-03 a member who is not the owner sees guests but cannot invite or add", async () => {
  mockMembers.mockResolvedValue({ ok: true, members: [m("b", "Ben", "registered", "member", true), m("g1", "Rahul", "guest", "guest")] });
  await render(<Guests />);
  expect(await screen.findByText("Rahul")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Invite" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Add guest" })).toBeNull();
});
