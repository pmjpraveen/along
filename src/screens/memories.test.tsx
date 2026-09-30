import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Memories from "../../app/trip/[id]/memories";

const mockList = jest.fn();
const mockNote = jest.fn();
const mockPhoto = jest.fn();
const mockPick = jest.fn();
jest.mock("../api/memories", () => ({
  listMemories: (...a: unknown[]) => mockList(...a), addNote: (...a: unknown[]) => mockNote(...a), addPhoto: (...a: unknown[]) => mockPhoto(...a),
}));
jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: (...a: unknown[]) => mockPick(...a) }));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "t1" }), useRouter: () => ({ back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const note = { id: "m1", type: "note", caption: null, body: "The sunset at Baga", place_name: null, created_at: "2026-12-06T09:00:00Z", author: "Ben", photoUrl: null };
beforeEach(() => { jest.clearAllMocks(); mockList.mockResolvedValue({ ok: true, memories: [note] }); });

test("7.3 the trip's memories are listed with who added them", async () => {
  await render(<Memories />);
  expect(await screen.findByText("The sunset at Baga")).toBeTruthy();
  expect(screen.getByText(/Ben · 06-12-2026/)).toBeTruthy();
});

test("7.3 adding a note saves it, clears the field and reloads the list", async () => {
  mockNote.mockResolvedValue({ ok: true });
  await render(<Memories />);
  await screen.findByText("The sunset at Baga");
  await fireEvent.changeText(screen.getByLabelText("Note"), "Best chai ever");
  await fireEvent.press(screen.getByRole("button", { name: "Add note" }));
  await waitFor(() => expect(mockNote).toHaveBeenCalledWith("t1", "Best chai ever", expect.any(String)));
  await waitFor(() => expect(screen.getByLabelText("Note").props.value).toBe(""));
  await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
});

test("7.3 a failed note keeps the text, and the retry uses the same key so it saves once", async () => {
  mockNote.mockResolvedValueOnce({ ok: false, message: "No connection. Check your internet and try again." }).mockResolvedValueOnce({ ok: true });
  await render(<Memories />);
  await screen.findByText("The sunset at Baga");
  await fireEvent.changeText(screen.getByLabelText("Note"), "Best chai ever");
  await fireEvent.press(screen.getByRole("button", { name: "Add note" }));
  expect(await screen.findByText(/No connection/)).toBeTruthy();
  expect(screen.getByLabelText("Note").props.value).toBe("Best chai ever");
  await fireEvent.press(screen.getByRole("button", { name: "Add note" }));
  await waitFor(() => expect(mockNote).toHaveBeenCalledTimes(2));
  expect(mockNote.mock.calls[0][2]).toBe(mockNote.mock.calls[1][2]);
});

test("7.3 a blank note is not sent", async () => {
  await render(<Memories />);
  await screen.findByText("The sunset at Baga");
  await fireEvent.press(screen.getByRole("button", { name: "Add note" }));
  expect(mockNote).not.toHaveBeenCalled();
});

test("7.3 picking a photo uploads it into this trip; cancelling the picker does nothing", async () => {
  mockPick.mockResolvedValueOnce({ canceled: true, assets: null });
  mockPhoto.mockResolvedValue({ ok: true });
  await render(<Memories />);
  await screen.findByText("The sunset at Baga");
  await fireEvent.press(screen.getByRole("button", { name: "Add a photo" }));
  expect(mockPhoto).not.toHaveBeenCalled();
  mockPick.mockResolvedValueOnce({ canceled: false, assets: [{ uri: "file:///beach.jpg", mimeType: "image/png" }] });
  await fireEvent.press(screen.getByRole("button", { name: "Add a photo" }));
  await waitFor(() => expect(mockPhoto).toHaveBeenCalledWith("t1", "file:///beach.jpg", "image/png", expect.any(String)));
});

test("7.3 a failed upload offers a retry that reuses the same key", async () => {
  mockPick.mockResolvedValue({ canceled: false, assets: [{ uri: "file:///beach.jpg", mimeType: "image/jpeg" }] });
  mockPhoto.mockResolvedValueOnce({ ok: false, message: "Couldn't upload the photo. Try again." }).mockResolvedValueOnce({ ok: true });
  await render(<Memories />);
  await screen.findByText("The sunset at Baga");
  await fireEvent.press(screen.getByRole("button", { name: "Add a photo" }));
  expect(await screen.findByText(/Couldn't upload the photo/)).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Retry upload" }));
  await waitFor(() => expect(mockPhoto).toHaveBeenCalledTimes(2));
  expect(mockPhoto.mock.calls[0][3]).toBe(mockPhoto.mock.calls[1][3]);
  await waitFor(() => expect(screen.queryByRole("button", { name: "Retry upload" })).toBeNull());
});

test("7.3 with no memories yet it invites the first one; a load failure shows retry", async () => {
  mockList.mockResolvedValueOnce({ ok: true, memories: [] });
  await render(<Memories />);
  expect(await screen.findByText(/No memories yet/)).toBeTruthy();
  mockList.mockResolvedValueOnce({ ok: false, message: "No connection. Check your internet and try again." });
  await render(<Memories />);
  expect(await screen.findByRole("button", { name: "Retry" })).toBeTruthy();
});
