import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Settle from "../../app/trip/[id]/settle";

const mockSettle = jest.fn();
const mockBack = jest.fn();
jest.mock("../api/settlements", () => ({ createSettlement: (...a: unknown[]) => mockSettle(...a) }));
jest.mock("../api/balances", () => ({
  loadBalances: async () => ({ ok: true, currency: { code: "INR", exponent: 2 }, rows: [
    { memberId: "b", name: "Ben", guest: false, isMe: true, net: -50000 }, { memberId: "a", name: "Asha", guest: false, isMe: false, net: 50000 } ] }),
}));
jest.mock("expo-router", () => ({ useLocalSearchParams: () => ({ id: "t1", from: "b", to: "a", amount: "50000" }), useRouter: () => ({ back: mockBack }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
beforeEach(() => jest.clearAllMocks());

const confirm = async () => fireEvent.press(screen.getByRole("button", { name: "Confirm payment" }));

test("5.5 the amount is pre-filled from the suggested payment and confirming records it", async () => {
  mockSettle.mockResolvedValue({ ok: true });
  await render(<Settle />);
  expect(await screen.findByText("You pay Asha")).toBeTruthy();
  await waitFor(() => expect(screen.getByLabelText("Amount").props.value).toBe("500.00"));
  await confirm();
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockSettle).toHaveBeenCalledWith(expect.objectContaining({ tripId: "t1", fromMemberId: "b", toMemberId: "a", amountMinor: 50000 }));
});

test("5.5 a smaller amount can be paid in part", async () => {
  mockSettle.mockResolvedValue({ ok: true });
  await render(<Settle />);
  await waitFor(() => expect(screen.getByLabelText("Amount").props.value).toBe("500.00"));
  await fireEvent.changeText(screen.getByLabelText("Amount"), "200");
  await confirm();
  await waitFor(() => expect(mockSettle.mock.calls[0][0].amountMinor).toBe(20000));
});

test("5.5 a rejected payment keeps the screen and shows the reason; the retry reuses the same key", async () => {
  mockSettle.mockResolvedValueOnce({ ok: false, message: "That's more than is still owed. Enter a smaller amount." }).mockResolvedValueOnce({ ok: true });
  await render(<Settle />);
  await waitFor(() => expect(screen.getByLabelText("Amount").props.value).toBe("500.00"));
  await confirm();
  expect(await screen.findByText(/more than is still owed/)).toBeTruthy();
  expect(mockBack).not.toHaveBeenCalled();
  await confirm();
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockSettle.mock.calls[0][0].key).toBe(mockSettle.mock.calls[1][0].key);
});

test("5.5 a zero amount is rejected before anything is sent", async () => {
  await render(<Settle />);
  await waitFor(() => expect(screen.getByLabelText("Amount").props.value).toBe("500.00"));
  await fireEvent.changeText(screen.getByLabelText("Amount"), "0");
  await confirm();
  expect(await screen.findByText(/greater than zero/)).toBeTruthy();
  expect(mockSettle).not.toHaveBeenCalled();
});
