import { fireEvent, render, screen } from "@testing-library/react-native";
import AddGuest from "../../app/trip/[id]/add-guest";

const mockAdd = jest.fn();
const mockBack = jest.fn();
jest.mock("../api/members", () => ({ addGuest: (...a: unknown[]) => mockAdd(...a) }));
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
