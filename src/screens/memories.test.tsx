import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Linking, Platform } from "react-native";
import Memories from "../../app/trip/[id]/memories";

const mockList = jest.fn();
const mockNote = jest.fn();
const mockPhoto = jest.fn();
const mockPick = jest.fn();
const mockPreview = jest.fn();
const mockAddLink = jest.fn();
const mockDelete = jest.fn();
const mockUpdate = jest.fn();
jest.mock("../api/memories", () => ({
  listMemories: (...a: unknown[]) => mockList(...a), addNote: (...a: unknown[]) => mockNote(...a), addPhoto: (...a: unknown[]) => mockPhoto(...a),
  previewLink: (...a: unknown[]) => mockPreview(...a), addLink: (...a: unknown[]) => mockAddLink(...a),
  deleteMemory: (...a: unknown[]) => mockDelete(...a), updateNote: (...a: unknown[]) => mockUpdate(...a),
}));
jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: (...a: unknown[]) => mockPick(...a) }));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "t1" }), useRouter: () => ({ back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const note = { id: "m1", type: "note", caption: null, body: "The sunset at Baga", place_name: null, created_at: "2026-12-06T09:00:00Z", author: "Ben", photoUrl: null, linkUrl: null, linkTitle: null, linkImage: null, canManage: true };
// The options sheet reports "fully closed" from the platform's own dismiss on iOS, which Jest does not run; Android reports it itself.
beforeAll(() => { jest.replaceProperty(Platform, "OS", "android"); });
beforeEach(() => { jest.clearAllMocks(); mockList.mockResolvedValue({ ok: true, memories: [note] }); });

test("7.3 the trip's memories are listed with who added them", async () => {
  await render(<Memories />);
  expect(await screen.findByText("The sunset at Baga")).toBeTruthy();
  expect(screen.getByText(/Ben · 6 Dec/)).toBeTruthy();
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
  mockNote.mockResolvedValueOnce({ ok: false, message: "You're offline. Check your connection and try again." }).mockResolvedValueOnce({ ok: true });
  await render(<Memories />);
  await screen.findByText("The sunset at Baga");
  await fireEvent.changeText(screen.getByLabelText("Note"), "Best chai ever");
  await fireEvent.press(screen.getByRole("button", { name: "Add note" }));
  expect(await screen.findByText(/You're offline/)).toBeTruthy();
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
  mockList.mockResolvedValueOnce({ ok: false, message: "You're offline. Check your connection and try again." });
  await render(<Memories />);
  expect(await screen.findByRole("button", { name: "Retry" })).toBeTruthy();
});

test("US-27 adding a Google Photos link reads its preview, saves it, closes the field and reloads", async () => {
  mockPreview.mockResolvedValue({ title: "Goa 2026", image: "https://lh3.googleusercontent.com/x" });
  mockAddLink.mockResolvedValue({ ok: true });
  await render(<Memories />);
  await fireEvent.press(await screen.findByRole("button", { name: "Add a Google Photos link" }));
  await fireEvent.changeText(screen.getByLabelText("Google Photos link"), "Our album https://photos.app.goo.gl/AbC123");
  await fireEvent.press(screen.getByRole("button", { name: "Add link" }));
  await waitFor(() => expect(mockAddLink).toHaveBeenCalledWith("t1", "https://photos.app.goo.gl/AbC123", expect.any(String), { title: "Goa 2026", image: "https://lh3.googleusercontent.com/x" }));
  expect(mockPreview).toHaveBeenCalledWith("https://photos.app.goo.gl/AbC123");
  await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
  expect(screen.queryByLabelText("Google Photos link")).toBeNull();
});

test("US-27 a link that is not Google Photos is refused inline and nothing is fetched or saved", async () => {
  await render(<Memories />);
  await fireEvent.press(await screen.findByRole("button", { name: "Add a Google Photos link" }));
  await fireEvent.changeText(screen.getByLabelText("Google Photos link"), "https://example.com/album");
  await fireEvent.press(screen.getByRole("button", { name: "Add link" }));
  expect(await screen.findByText(/Paste a Google Photos share link/)).toBeTruthy();
  expect(mockPreview).not.toHaveBeenCalled();
  expect(mockAddLink).not.toHaveBeenCalled();
});

test("US-27 a failed save keeps the link in the field and says why", async () => {
  mockPreview.mockResolvedValue({ title: null, image: null });
  mockAddLink.mockResolvedValue({ ok: false, message: "Couldn't save the link. Try again." });
  await render(<Memories />);
  await fireEvent.press(await screen.findByRole("button", { name: "Add a Google Photos link" }));
  await fireEvent.changeText(screen.getByLabelText("Google Photos link"), "photos.app.goo.gl/AbC123");
  await fireEvent.press(screen.getByRole("button", { name: "Add link" }));
  expect(await screen.findByText("Couldn't save the link. Try again.")).toBeTruthy();
  expect(screen.getByDisplayValue("photos.app.goo.gl/AbC123")).toBeTruthy();
});

test("US-27 a link memory shows as a card with its title and opens in Google Photos when tapped", async () => {
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
  mockList.mockResolvedValue({ ok: true, memories: [{ ...note, id: "l1", type: "link", body: null, linkUrl: "https://photos.app.goo.gl/AbC123", linkTitle: "Goa 2026", linkImage: "https://lh3.googleusercontent.com/x" }] });
  await render(<Memories />);
  expect(await screen.findByText("Goa 2026")).toBeTruthy();
  expect(screen.getByText("Open in Google Photos")).toBeTruthy();
  await fireEvent.press(screen.getByRole("link", { name: "Goa 2026, opens in Google Photos" }));
  expect(open).toHaveBeenCalledWith("https://photos.app.goo.gl/AbC123");
});

test("US-27 a link with no preview still shows a card", async () => {
  mockList.mockResolvedValue({ ok: true, memories: [{ ...note, id: "l2", type: "link", body: null, linkUrl: "https://photos.app.goo.gl/Zzz", linkTitle: null, linkImage: null }] });
  await render(<Memories />);
  expect(await screen.findByText("Photos on Google Photos")).toBeTruthy();
});

test("US-27 the options button shows only on memories I can manage", async () => {
  mockList.mockResolvedValue({ ok: true, memories: [note, { ...note, id: "m2", body: "Their note", canManage: false }] });
  await render(<Memories />);
  expect(await screen.findByText("Their note")).toBeTruthy();
  expect(screen.getAllByRole("button", { name: "Options for this note" })).toHaveLength(1);
});

test("US-27 a note can be edited from its options: the text is prefilled, saved, and the list reloads", async () => {
  mockUpdate.mockResolvedValue({ ok: true });
  await render(<Memories />);
  await fireEvent.press(await screen.findByRole("button", { name: "Options for this note" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Edit note" }));
  expect(await screen.findByDisplayValue("The sunset at Baga")).toBeTruthy();
  await fireEvent.changeText(screen.getByDisplayValue("The sunset at Baga"), "The sunset at Calangute");
  await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith("m1", "The sunset at Calangute"));
  await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
});

test("US-27 a failed edit shows why and keeps what I typed", async () => {
  mockUpdate.mockResolvedValue({ ok: false, message: "Couldn't save your changes. Try again." });
  await render(<Memories />);
  await fireEvent.press(await screen.findByRole("button", { name: "Options for this note" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Edit note" }));
  await fireEvent.changeText(await screen.findByDisplayValue("The sunset at Baga"), "Changed");
  await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByText("Couldn't save your changes. Try again.")).toBeTruthy();
  expect(screen.getByDisplayValue("Changed")).toBeTruthy();
});

test("US-27 deleting a memory asks first, then deletes it and reloads", async () => {
  mockDelete.mockResolvedValue({ ok: true });
  await render(<Memories />);
  await fireEvent.press(await screen.findByRole("button", { name: "Options for this note" }));
  await fireEvent.press(await screen.findByRole("button", { name: /^Delete/ }));
  expect(await screen.findByText("Delete this memory?")).toBeTruthy();
  expect(mockDelete).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() => expect(mockDelete).toHaveBeenCalledWith("m1"));
  await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
});

test("US-27 keeping the memory from the confirmation deletes nothing", async () => {
  await render(<Memories />);
  await fireEvent.press(await screen.findByRole("button", { name: "Options for this note" }));
  await fireEvent.press(await screen.findByRole("button", { name: /^Delete/ }));
  await fireEvent.press(await screen.findByRole("button", { name: "Keep" }));
  expect(mockDelete).not.toHaveBeenCalled();
});

test("US-27 a link or a photo can be deleted but has no Edit option", async () => {
  mockList.mockResolvedValue({ ok: true, memories: [{ ...note, id: "l1", type: "link", body: null, linkUrl: "https://photos.app.goo.gl/x", linkTitle: "Goa", linkImage: null }] });
  await render(<Memories />);
  await fireEvent.press(await screen.findByRole("button", { name: "Options for this link" }));
  expect(await screen.findByRole("button", { name: /^Delete/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Edit note" })).toBeNull();
});
