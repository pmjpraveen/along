import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Platform, Share } from "react-native";
import { TripMenu } from "./TripMenu";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockDelete = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace }) }));
jest.mock("../api/trips", () => ({
  deleteTrip: (...a: unknown[]) => mockDelete(...a),
  loadTripSettings: async () => ({ ok: true, settings: { name: "Goa trip", destination: "Goa, India", start: "2026-12-01", end: "2026-12-05" } }),
}));
jest.mock("../api/invites", () => ({ createInviteLink: async () => ({ ok: true, url: "along://join/tok", token: "tok" }) }));
jest.mock("../api/members", () => ({ listMembers: async () => ({ ok: true, members: [{ id: "a" }, { id: "b" }] }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

// The sheet reports "fully closed" from the platform's own dismiss on iOS, which Jest does not run; Android reports it itself.
beforeAll(() => { jest.replaceProperty(Platform, "OS", "android"); });
afterAll(() => { jest.restoreAllMocks(); });
beforeEach(() => jest.clearAllMocks());

// The parent owns whether the sheet is open, so the test host does the same.
import { useState } from "react";
function Host({ isOwner }: { isOwner: boolean }) {
  const [open, setOpen] = useState(true);
  return <TripMenu tripId="t1" isOwner={isOwner} visible={open} onClose={() => setOpen(false)} />;
}

test("the owner sees Trip settings, End trip and Delete trip", async () => {
  await render(<Host isOwner />);
  expect(screen.getByRole("button", { name: /^Trip settings/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /^End trip/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /^Delete trip/ })).toBeTruthy();
});

test("a member who is not the owner only sees Trip settings", async () => {
  await render(<Host isOwner={false} />);
  expect(screen.getByRole("button", { name: /^Trip settings/ })).toBeTruthy();
  expect(screen.queryByText("End trip")).toBeNull();
  expect(screen.queryByText("Delete trip")).toBeNull();
});

test("Trip settings and End trip close the sheet and then open their pages", async () => {
  await render(<Host isOwner />);
  await fireEvent.press(screen.getByRole("button", { name: /^Trip settings/ }));
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/settings", params: { id: "t1" } }));
  await render(<Host isOwner />);
  await fireEvent.press(screen.getByRole("button", { name: /^End trip/ }));
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/complete", params: { id: "t1" } }));
});

test("Delete trip asks first, then deletes once and goes back to Home", async () => {
  mockDelete.mockResolvedValue({ ok: true });
  await render(<Host isOwner />);
  await fireEvent.press(screen.getByRole("button", { name: /^Delete trip/ }));
  expect(await screen.findByText("Delete this trip?")).toBeTruthy();
  expect(mockDelete).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Delete trip" }));
  await waitFor(() => expect(mockDelete).toHaveBeenCalledWith("t1"));
  expect(mockDelete).toHaveBeenCalledTimes(1);
  expect(mockReplace).toHaveBeenCalledWith("/");
});

test("choosing Keep the trip deletes nothing, and a failed delete keeps the trip and says why", async () => {
  await render(<Host isOwner />);
  await fireEvent.press(screen.getByRole("button", { name: /^Delete trip/ }));
  await fireEvent.press(await screen.findByRole("button", { name: "Keep the trip" }));
  expect(mockDelete).not.toHaveBeenCalled();

  mockDelete.mockResolvedValue({ ok: false, message: "You're offline. Check your connection and try again." });
  await render(<Host isOwner />);
  await fireEvent.press(screen.getAllByRole("button", { name: /^Delete trip/ })[0]);
  await fireEvent.press(await screen.findByRole("button", { name: "Delete trip" }));
  expect(await screen.findByText(/You're offline/)).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
});

test("US-03 Share trip opens the share sheet with the trip's name, days, people and join link", async () => {
  const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as never);
  await render(<Host isOwner />);
  await fireEvent.press(screen.getByRole("button", { name: /^Share trip/ }));
  await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
  const { message } = share.mock.calls[0][0] as { message: string };
  expect(message).toContain("*Goa trip*");
  expect(message).toContain("5 days");
  expect(message).toContain("2 people going");
  expect(message).toContain("/join/tok");
});

test("US-03 a member who is not the owner does not see Share trip", async () => {
  await render(<Host isOwner={false} />);
  expect(screen.queryByRole("button", { name: /^Share trip/ })).toBeNull();
});
