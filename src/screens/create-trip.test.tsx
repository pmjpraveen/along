import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import CreateTrip from "../../app/create-trip";

const mockCreate = jest.fn();
const mockReplace = jest.fn();
jest.mock("../components/DateField", () => {
  const { TextInput } = require("react-native");
  return { DateField: ({ label, value, onChange }: any) => <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} /> };
});
jest.mock("../api/trips", () => ({ createTrip: (...a: unknown[]) => mockCreate(...a) }));
jest.mock("expo-router", () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const fill = async (name: string, start = "2026-12-01", end = "2026-12-05") => {
  await fireEvent.changeText(screen.getByLabelText("Trip name"), name);
  await fireEvent.changeText(screen.getByLabelText("Destination"), "Goa, India");
  await fireEvent.changeText(screen.getByLabelText("Start date"), start);
  await fireEvent.changeText(screen.getByLabelText("End date"), end);
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
