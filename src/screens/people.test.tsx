import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import People from "../../app/trip/[id]/people";

const mockList = jest.fn();
const mockAdd = jest.fn();
jest.mock("../api/members", () => ({ listMembers: (...a: unknown[]) => mockList(...a), addGuest: (...a: unknown[]) => mockAdd(...a) }));
const mockStatus = jest.fn();
jest.mock("../api/trips", () => ({ loadTripStatus: (...a: unknown[]) => mockStatus(...a) }));
jest.mock("../api/invites", () => ({ createInviteLink: jest.fn() }));
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "t1" }), useRouter: () => ({ push: mockPush }),
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const owner = { id: "m1", display_name: "Asha", membership_type: "registered", role: "owner", isMe: true };
const guest = { id: "m2", display_name: "Rahul", membership_type: "guest", role: "guest" };
beforeEach(() => { jest.clearAllMocks(); mockList.mockResolvedValue({ ok: true, members: [owner] }); mockStatus.mockResolvedValue({ ok: true, status: "published", completedAt: null }); });

test("US-02 adding a guest calls the API, clears the field and shows the guest with a Guest tag", async () => {
  mockAdd.mockResolvedValue({ ok: true });
  await render(<People />);
  await screen.findByText("Asha");
  mockList.mockResolvedValue({ ok: true, members: [owner, guest] });
  await fireEvent.changeText(screen.getByLabelText("Guest name"), "Rahul");
  await fireEvent.press(screen.getByRole("button", { name: "Add guest" }));
  expect(await screen.findByText("Guest")).toBeTruthy();
  expect(mockAdd).toHaveBeenCalledWith("t1", "Rahul");
  expect(screen.getByLabelText("Guest name").props.value).toBe("");
});

test("US-02 a blank name shows an inline error and adds nothing", async () => {
  await render(<People />);
  await screen.findByText("Asha");
  await fireEvent.press(screen.getByRole("button", { name: "Add guest" }));
  expect(await screen.findByText(/Enter a name/)).toBeTruthy();
  expect(mockAdd).not.toHaveBeenCalled();
});

test("US-02 a rejected add keeps the typed name and shows the reason", async () => {
  mockAdd.mockResolvedValue({ ok: false, message: "Only the trip owner can add guests." });
  await render(<People />);
  await screen.findByText("Asha");
  await fireEvent.changeText(screen.getByLabelText("Guest name"), "Rahul");
  await fireEvent.press(screen.getByRole("button", { name: "Add guest" }));
  expect(await screen.findByText(/Only the trip owner/)).toBeTruthy();
  await waitFor(() => expect(screen.getByLabelText("Guest name").props.value).toBe("Rahul"));
});

test("US-02 a load failure shows retry", async () => {
  mockList.mockResolvedValueOnce({ ok: false, message: "No connection." });
  await render(<People />);
  await fireEvent.press(await screen.findByRole("button", { name: "Retry" }));
  expect(await screen.findByText("Asha")).toBeTruthy();
});

test("7.1 the owner of an open trip sees Complete trip, and it opens the confirmation", async () => {
  await render(<People />);
  await fireEvent.press(await screen.findByRole("button", { name: "Complete trip" }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/complete", params: { id: "t1" } });
});

test("7.1 a member who is not the owner does not see Complete trip", async () => {
  mockList.mockResolvedValue({ ok: true, members: [{ ...owner, isMe: false }, { id: "m3", display_name: "Ben", membership_type: "registered", role: "member", isMe: true }] });
  await render(<People />);
  await screen.findByText("Ben");
  expect(screen.queryByRole("button", { name: "Complete trip" })).toBeNull();
});

test("7.1 a completed trip says so, keeps everything readable, and no longer offers Complete trip", async () => {
  mockStatus.mockResolvedValue({ ok: true, status: "completed", completedAt: "2026-12-06T10:00:00Z" });
  await render(<People />);
  expect(await screen.findByText(/This trip is completed. Everything is still here to read/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Complete trip" })).toBeNull();
  expect(screen.getByRole("button", { name: "Expenses" })).toBeTruthy();
});
