import { fireEvent, render, screen } from "@testing-library/react-native";
import AddGuest from "../../app/trip/[id]/add-guest";

const mockAdd = jest.fn();
const mockBack = jest.fn();
const mockAddEmail = jest.fn();
jest.mock("../api/members", () => ({ addGuest: (...a: unknown[]) => mockAdd(...a), addMemberByEmail: (...a: unknown[]) => mockAddEmail(...a) }));
jest.mock("expo-router", () => ({ useGlobalSearchParams: () => ({ id: "t1" }), useRouter: () => ({ back: mockBack }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
beforeEach(() => jest.clearAllMocks());

test("US-02 adding a guest calls the API once and closes the sheet", async () => {
  mockAdd.mockResolvedValue({ ok: true });
  await render(<AddGuest />);
  await fireEvent.changeText(screen.getByLabelText("Guest name"), "Rahul");
  await fireEvent.press(screen.getByRole("button", { name: "Add guest" }));
  expect(mockAdd).toHaveBeenCalledWith("t1", "Rahul");
  expect(await screen.findByLabelText("Guest name")).toBeTruthy();
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test("US-02 a blank name shows an inline error and adds nothing", async () => {
  await render(<AddGuest />);
  await fireEvent.press(screen.getByRole("button", { name: "Add guest" }));
  expect(await screen.findByText(/Enter a name/)).toBeTruthy();
  expect(mockAdd).not.toHaveBeenCalled();
});

test("US-02 a rejected add keeps the typed name, shows the reason and stays open", async () => {
  mockAdd.mockResolvedValue({ ok: false, message: "Only the trip owner can add guests." });
  await render(<AddGuest />);
  await fireEvent.changeText(screen.getByLabelText("Guest name"), "Rahul");
  await fireEvent.press(screen.getByRole("button", { name: "Add guest" }));
  expect(await screen.findByText(/Only the trip owner/)).toBeTruthy();
  expect(screen.getByLabelText("Guest name").props.value).toBe("Rahul");
  expect(mockBack).not.toHaveBeenCalled();
});

test("US-02 someone already on along is added straight to the trip by email, once, and the sheet closes", async () => {
  mockAddEmail.mockResolvedValue({ ok: true, name: "Ben" });
  await render(<AddGuest />);
  await fireEvent.press(screen.getByRole("radio", { name: "Already on along" }));
  await fireEvent.changeText(screen.getByLabelText("Their email"), "ben@example.com");
  await fireEvent.press(screen.getByRole("button", { name: "Add to trip" }));
  expect(mockAddEmail).toHaveBeenCalledWith("t1", "ben@example.com");
  expect(mockAddEmail).toHaveBeenCalledTimes(1);
  expect(await screen.findByLabelText("Their email")).toBeTruthy();
  expect(mockAdd).not.toHaveBeenCalled();
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test("US-02 an email that is not valid, or that nobody uses, explains what to do and keeps what was typed", async () => {
  mockAddEmail.mockResolvedValue({ ok: false, message: "No one on along uses that email. Add them as a guest and send an invite instead." });
  await render(<AddGuest />);
  await fireEvent.press(screen.getByRole("radio", { name: "Already on along" }));
  await fireEvent.changeText(screen.getByLabelText("Their email"), "nope");
  await fireEvent.press(screen.getByRole("button", { name: "Add to trip" }));
  expect(await screen.findByText(/Enter their email address/)).toBeTruthy();
  expect(mockAddEmail).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText("Their email"), "nobody@example.com");
  await fireEvent.press(screen.getByRole("button", { name: "Add to trip" }));
  expect(await screen.findByText(/Add them as a guest and send an invite instead/)).toBeTruthy();
  expect(screen.getByLabelText("Their email").props.value).toBe("nobody@example.com");
  expect(mockBack).not.toHaveBeenCalled();
});
