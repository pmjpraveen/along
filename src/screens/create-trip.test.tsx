import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import CreateTrip from "../../app/create-trip";

const mockCreate = jest.fn();
const mockReplace = jest.fn();
jest.mock("../components/DateRangeField", () => {
  const { TextInput } = require("react-native");
  return { DateRangeField: ({ label, start, end, onChange }: any) => <TextInput accessibilityLabel={label} value={`${start}|${end}`} onChangeText={(v: string) => { const [s, e] = v.split("|"); onChange({ start: s, end: e ?? "" }); }} /> };
});
const mockUploadCover = jest.fn();
const mockPick = jest.fn();
jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: (...a: unknown[]) => mockPick(...a) }));
jest.mock("../api/trips", () => ({ createTrip: (...a: unknown[]) => mockCreate(...a), uploadCover: (...a: unknown[]) => mockUploadCover(...a) }));
jest.mock("expo-router", () => ({ useRouter: () => ({ replace: mockReplace, back: jest.fn() }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const fill = async (name: string, start = "2099-12-01", end = "2099-12-05") => {
  await fireEvent.changeText(screen.getByLabelText("Trip name"), name);
  await fireEvent.changeText(screen.getByLabelText("Location"), "Goa, India");
  await fireEvent.changeText(screen.getByLabelText("Duration"), `${start}|${end}`);
};
const submit = async () => fireEvent.press(screen.getByRole("button", { name: "Create trip" }));
beforeEach(() => jest.clearAllMocks());

test("US-01 a blank name shows an inline error and creates nothing", async () => {
  await render(<CreateTrip />);
  await fill("");
  await submit();
  expect(await screen.findByText(/Give your trip a name/)).toBeTruthy();
  expect(mockCreate).not.toHaveBeenCalled();
});

test("US-01 a failed create keeps the form data and a retry reuses the same idempotency key", async () => {
  mockCreate.mockResolvedValueOnce({ ok: false, message: "Couldn't create the trip. Try again." }).mockResolvedValueOnce({ ok: true, tripId: "t1" });
  await render(<CreateTrip />);
  await fill("Goa");
  await submit();
  expect(await screen.findByText(/Couldn't create the trip/)).toBeTruthy();
  expect(screen.getByLabelText("Trip name").props.value).toBe("Goa");
  await submit();
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({ pathname: "/trip/[id]/people", params: { id: "t1" } }));
  expect(mockCreate.mock.calls[0][2]).toBe(mockCreate.mock.calls[1][2]);
});

test("cover: a photo picked while creating is uploaded to the new trip, and the trip opens", async () => {
  mockCreate.mockResolvedValue({ ok: true, tripId: "t9" });
  mockUploadCover.mockResolvedValue({ ok: true });
  mockPick.mockResolvedValue({ canceled: false, assets: [{ uri: "file:///goa.jpg", mimeType: "image/png" }] });
  await render(<CreateTrip />);
  await fill("Goa");
  await fireEvent.press(screen.getByRole("button", { name: "Add image" }));
  expect(await screen.findByRole("button", { name: "Change image" })).toBeTruthy();
  await submit();
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({ pathname: "/trip/[id]/people", params: { id: "t9" } }));
  expect(mockUploadCover).toHaveBeenCalledWith("t9", "file:///goa.jpg", "image/png");
});

test("cover: the cover is optional, and a failed cover upload never blocks the trip", async () => {
  mockCreate.mockResolvedValue({ ok: true, tripId: "t9" });
  await render(<CreateTrip />);
  await fill("Goa");
  await submit();
  await waitFor(() => expect(mockReplace).toHaveBeenCalled());
  expect(mockUploadCover).not.toHaveBeenCalled();
  jest.clearAllMocks();
  mockCreate.mockResolvedValue({ ok: true, tripId: "t10" });
  mockUploadCover.mockResolvedValue({ ok: false, message: "Couldn't upload the photo. Try again." });
  mockPick.mockResolvedValue({ canceled: false, assets: [{ uri: "file:///goa.jpg", mimeType: "image/jpeg" }] });
  await fireEvent.press(screen.getByRole("button", { name: "Add image" }));
  await submit();
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({ pathname: "/trip/[id]/people", params: { id: "t10" } }));
});
