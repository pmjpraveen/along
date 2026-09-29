import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import People from "../../app/trip/[id]/people";

const mockList = jest.fn();
const mockAdd = jest.fn();
jest.mock("../api/members", () => ({ listMembers: (...a: unknown[]) => mockList(...a), addGuest: (...a: unknown[]) => mockAdd(...a) }));
jest.mock("../api/invites", () => ({ createInviteLink: jest.fn() }));
jest.mock("expo-router", () => ({ useLocalSearchParams: () => ({ id: "t1" }), useRouter: () => ({ push: jest.fn() }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const owner = { id: "m1", display_name: "Asha", membership_type: "registered", role: "owner" };
const guest = { id: "m2", display_name: "Rahul", membership_type: "guest", role: "guest" };
beforeEach(() => { jest.clearAllMocks(); mockList.mockResolvedValue({ ok: true, members: [owner] }); });

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
