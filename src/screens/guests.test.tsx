import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Share } from "react-native";
import Guests from "../../app/trip/[id]/guests";

const mockMembers = jest.fn();
const mockInvite = jest.fn();
const mockPush = jest.fn();
const mockRemove = jest.fn();
jest.mock("../api/members", () => ({ listMembers: (...a: unknown[]) => mockMembers(...a), removeGuest: (...a: unknown[]) => mockRemove(...a) }));
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

test("US-03 a segmented control switches between who has joined and who is yet to join, with Invite only on those yet to join", async () => {
  await render(<Guests />);
  expect(await screen.findByRole("tab", { name: "Joined (1)" })).toBeTruthy();
  expect(screen.getByText("Asha (you)")).toBeTruthy();
  expect(screen.queryByText("Rahul")).toBeNull();
  await fireEvent.press(screen.getByRole("tab", { name: "Yet to join (2)" }));
  expect(screen.queryByText("Asha (you)")).toBeNull();
  expect(screen.getByText("Rahul")).toBeTruthy();
  expect(screen.getByText("Meera")).toBeTruthy();
  expect(screen.getAllByRole("button", { name: "Invite" })).toHaveLength(2);
  await fireEvent.press(screen.getByRole("button", { name: "Add guest" }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/add-guest", params: { id: "t1" } });
});

test("US-03 a guest who accepts moves from Yet to join to Joined and loses their Invite button", async () => {
  mockMembers.mockResolvedValue({ ok: true, members: [m("a", "Asha", "registered", "owner", true), m("g1", "Rahul", "registered", "member"), m("g2", "Meera", "guest", "guest")] });
  await render(<Guests />);
  expect(await screen.findByRole("tab", { name: "Joined (2)" })).toBeTruthy();
  expect(screen.getByText("Rahul")).toBeTruthy();
  await fireEvent.press(screen.getByRole("tab", { name: "Yet to join (1)" }));
  expect(screen.queryByText("Rahul")).toBeNull();
  expect(screen.getAllByRole("button", { name: "Invite" })).toHaveLength(1);
});

test("US-03 when everyone has joined, Yet to join says so", async () => {
  mockMembers.mockResolvedValue({ ok: true, members: [m("a", "Asha", "registered", "owner", true), m("b", "Ben", "registered", "member")] });
  await render(<Guests />);
  await fireEvent.press(await screen.findByRole("tab", { name: "Yet to join (0)" }));
  expect(await screen.findByText("Everyone has joined.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Invite" })).toBeNull();
});

test("US-03 Invite makes a claim link for that guest and shares a personal message", async () => {
  mockInvite.mockResolvedValue({ ok: true, url: "along://join/tok", token: "tok" });
  const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as never);
  await render(<Guests />);
  await fireEvent.press(await screen.findByRole("tab", { name: "Yet to join (2)" }));
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
  await fireEvent.press(await screen.findByRole("tab", { name: "Yet to join (1)" }));
  expect(await screen.findByText("Rahul")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Invite" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Add guest" })).toBeNull();
});

const swipeDelete = async (name: string) => fireEvent(await screen.findByText(name), "accessibilityAction", { nativeEvent: { actionName: "delete" } });

test("US-03 the owner deletes a guest who has not joined, after a confirmation, and the list reloads", async () => {
  mockRemove.mockResolvedValue({ ok: true });
  await render(<Guests />);
  await fireEvent.press(await screen.findByRole("tab", { name: "Yet to join (2)" }));
  await swipeDelete("Rahul");
  expect(await screen.findByText("Delete Rahul?")).toBeTruthy();
  expect(mockRemove).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() => expect(mockRemove).toHaveBeenCalledWith("g1"));
  await waitFor(() => expect(mockMembers).toHaveBeenCalledTimes(2));
});

test("US-03 keeping the guest from the confirmation deletes nothing", async () => {
  await render(<Guests />);
  await fireEvent.press(await screen.findByRole("tab", { name: "Yet to join (2)" }));
  await swipeDelete("Meera");
  await fireEvent.press(await screen.findByRole("button", { name: "Keep" }));
  expect(mockRemove).not.toHaveBeenCalled();
});

test("US-03 a refused delete shows why and keeps the dialog open", async () => {
  mockRemove.mockResolvedValue({ ok: false, message: "Only guests who haven't joined can be deleted." });
  await render(<Guests />);
  await fireEvent.press(await screen.findByRole("tab", { name: "Yet to join (2)" }));
  await swipeDelete("Rahul");
  await fireEvent.press(await screen.findByRole("button", { name: "Delete" }));
  expect(await screen.findByText("Only guests who haven't joined can be deleted.")).toBeTruthy();
});

test("US-03 people who have joined have no delete option, even for the owner", async () => {
  mockMembers.mockResolvedValue({ ok: true, members: [m("a", "Asha", "registered", "owner", true), m("b", "Ben", "registered", "member"), m("g1", "Rahul", "guest", "guest")] });
  await render(<Guests />);
  expect(await screen.findByText("Ben")).toBeTruthy();
  expect(screen.queryByRole("button", { name: /^Delete/ })).toBeNull();
  await fireEvent(screen.getByText("Ben"), "accessibilityAction", { nativeEvent: { actionName: "delete" } });
  expect(screen.queryByText(/^Delete Ben/)).toBeNull();
});

test("US-03 a member who is not the owner has no delete option on guests", async () => {
  mockMembers.mockResolvedValue({ ok: true, members: [m("b", "Ben", "registered", "member", true), m("g1", "Rahul", "guest", "guest")] });
  await render(<Guests />);
  await fireEvent.press(await screen.findByRole("tab", { name: "Yet to join (1)" }));
  await fireEvent(await screen.findByText("Rahul"), "accessibilityAction", { nativeEvent: { actionName: "delete" } });
  expect(screen.queryByText(/^Delete Rahul/)).toBeNull();
});
