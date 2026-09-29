import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import People from "../../app/trip/[id]/settings";

const mockList = jest.fn();
const mockAdd = jest.fn();
jest.mock("../api/members", () => ({ listMembers: (...a: unknown[]) => mockList(...a), addGuest: (...a: unknown[]) => mockAdd(...a) }));
const mockStatus = jest.fn();
const mockUploadCover = jest.fn();
const mockPick = jest.fn();
jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: (...a: unknown[]) => mockPick(...a) }));
jest.mock("../api/trips", () => ({ loadTripStatus: (...a: unknown[]) => mockStatus(...a), uploadCover: (...a: unknown[]) => mockUploadCover(...a) }));
jest.mock("../hooks/useTripRealtime", () => ({ useTripRealtime: jest.fn() }));
jest.mock("../api/invites", () => ({ createInviteLink: jest.fn() }));
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useGlobalSearchParams: () => ({ id: "t1" }), useLocalSearchParams: () => ({ id: "t1" }), useRouter: () => ({ push: mockPush }),
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const owner = { id: "m1", display_name: "Asha", membership_type: "registered", role: "owner", isMe: true };
const guest = { id: "m2", display_name: "Rahul", membership_type: "guest", role: "guest" };
beforeEach(() => { jest.clearAllMocks(); mockList.mockResolvedValue({ ok: true, members: [owner] }); mockStatus.mockResolvedValue({ ok: true, status: "published", completedAt: null, name: "Goa", destination: "Goa, India", coverUrl: null }); });

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
  mockStatus.mockResolvedValue({ ok: true, status: "completed", completedAt: "2026-12-06T10:00:00Z", name: "Goa", destination: "Goa, India", coverUrl: null });
  await render(<People />);
  expect(await screen.findByText(/This trip is completed. Everything is still here to read/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Complete trip" })).toBeNull();
  expect(screen.getByRole("button", { name: "Memories" })).toBeTruthy();
});

test("cover: the trip shows its photo in the header, or its destination when it has none", async () => {
  mockStatus.mockResolvedValue({ ok: true, status: "published", completedAt: null, name: "Goa", destination: "Goa, India", coverUrl: "https://example.com/goa.jpg" });
  await render(<People />);
  expect(await screen.findByRole("image", { name: "Cover photo of Goa, India" })).toBeTruthy();
});

test("cover: the owner can add a cover photo, and the header refreshes", async () => {
  mockPick.mockResolvedValue({ canceled: false, assets: [{ uri: "file:///goa.jpg", mimeType: "image/jpeg" }] });
  mockUploadCover.mockResolvedValue({ ok: true });
  await render(<People />);
  await fireEvent.press(await screen.findByRole("button", { name: "Add a cover photo" }));
  await waitFor(() => expect(mockUploadCover).toHaveBeenCalledWith("t1", "file:///goa.jpg", "image/jpeg"));
  await waitFor(() => expect(mockStatus.mock.calls.length).toBeGreaterThan(1));
});

test("cover: a failed upload says why, and cancelling the picker changes nothing", async () => {
  mockPick.mockResolvedValueOnce({ canceled: true, assets: null });
  await render(<People />);
  await fireEvent.press(await screen.findByRole("button", { name: "Add a cover photo" }));
  expect(mockUploadCover).not.toHaveBeenCalled();
  mockPick.mockResolvedValueOnce({ canceled: false, assets: [{ uri: "file:///goa.jpg", mimeType: "image/jpeg" }] });
  mockUploadCover.mockResolvedValue({ ok: false, message: "Couldn't upload the photo. Try again." });
  await fireEvent.press(screen.getByRole("button", { name: "Add a cover photo" }));
  expect(await screen.findByText(/Couldn't upload the photo/)).toBeTruthy();
});

test("cover: a member who is not the owner has no cover button", async () => {
  mockList.mockResolvedValue({ ok: true, members: [{ ...owner, isMe: false }, { id: "m3", display_name: "Ben", membership_type: "registered", role: "member", isMe: true }] });
  await render(<People />);
  await screen.findByText("Ben");
  expect(screen.queryByRole("button", { name: /cover photo/ })).toBeNull();
});
