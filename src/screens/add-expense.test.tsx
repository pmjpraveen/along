import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import AddExpense from "../../app/trip/[id]/add-expense";

const mockCreate = jest.fn();
const mockBack = jest.fn();
jest.mock("../api/expenses", () => ({
  loadExpenseForm: async () => ({ ok: true, data: { currency: { code: "INR", exponent: 2 }, members: [
    { id: "m2", name: "Ben", guest: false, isMe: false }, { id: "m1", name: "Asha", guest: false, isMe: true }, { id: "m3", name: "Rahul", guest: true, isMe: false } ] } }),
  createExpense: (...a: unknown[]) => mockCreate(...a),
}));
jest.mock("expo-router", () => ({ useLocalSearchParams: () => ({ id: "t1" }), useRouter: () => ({ back: mockBack }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
beforeEach(() => jest.clearAllMocks());

const fill = async (amount: string, title: string) => {
  await fireEvent.changeText(await screen.findByLabelText("Amount"), amount);
  await fireEvent.changeText(screen.getByLabelText("Title"), title);
};
const save = async () => fireEvent.press(screen.getByRole("button", { name: "Save" }));

test("US-05 amount + title + Save logs an expense with an equal split among everyone, payer left to the server default", async () => {
  mockCreate.mockResolvedValue({ ok: true });
  await render(<AddExpense />);
  await fill("1000", "Lunch");
  await save();
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  const call = mockCreate.mock.calls[0][0];
  expect(call).toMatchObject({ tripId: "t1", title: "Lunch", amountMinor: 100000 });
  expect(call.paidBy).toBeUndefined();
  expect(call.split.reduce((s: number, x: { owedMinor: number }) => s + x.owedMinor, 0)).toBe(100000);
  expect(call.split.map((x: { memberId: string }) => x.memberId)).toEqual(["m1", "m2", "m3"]);
});

test("US-05 a missing amount or title shows inline errors and saves nothing", async () => {
  await render(<AddExpense />);
  await screen.findByLabelText("Amount");
  await save();
  expect(await screen.findByText(/Enter an amount greater than zero/)).toBeTruthy();
  expect(screen.getByText("⚠ What was it for?")).toBeTruthy();
  expect(mockCreate).not.toHaveBeenCalled();
});

test("US-05 a failed save keeps the form, and the retry reuses the same idempotency key", async () => {
  mockCreate.mockResolvedValueOnce({ ok: false, message: "No connection. Check your internet and try again." }).mockResolvedValueOnce({ ok: true });
  await render(<AddExpense />);
  await fill("250.50", "Taxi");
  await save();
  expect(await screen.findByText(/No connection/)).toBeTruthy();
  expect(screen.getByLabelText("Title").props.value).toBe("Taxi");
  await save();
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockCreate.mock.calls[0][0].key).toBe(mockCreate.mock.calls[1][0].key);
  expect(mockCreate.mock.calls[1][0].amountMinor).toBe(25050);
});

test("US-06 choosing someone else as payer sends them as payer; the split stays with everyone", async () => {
  mockCreate.mockResolvedValue({ ok: true });
  await render(<AddExpense />);
  await fill("900", "Dinner");
  await fireEvent.press(screen.getByRole("button", { name: /Change who paid/ }));
  await fireEvent.press(screen.getByRole("radio", { name: "Rahul, guest" }));
  await save();
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockCreate.mock.calls[0][0].paidBy).toBe("m3");
  expect(mockCreate.mock.calls[0][0].split).toHaveLength(3);
});

test("US-06 picking myself again sends no explicit payer", async () => {
  mockCreate.mockResolvedValue({ ok: true });
  await render(<AddExpense />);
  await fill("900", "Dinner");
  await fireEvent.press(screen.getByRole("button", { name: /Change who paid/ }));
  await fireEvent.press(screen.getByRole("radio", { name: "Ben" }));
  await fireEvent.press(screen.getByRole("button", { name: /Change who paid/ }));
  await fireEvent.press(screen.getByRole("radio", { name: "You" }));
  await save();
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockCreate.mock.calls[0][0].paidBy).toBeUndefined();
});

test("US-07 only the people I select are in the split, and it still sums to the total", async () => {
  mockCreate.mockResolvedValue({ ok: true });
  await render(<AddExpense />);
  await fill("1001", "Dinner");
  await fireEvent.press(screen.getByRole("button", { name: /Change who's in/ }));
  await fireEvent.press(screen.getByRole("checkbox", { name: "Asha (you)" }));
  await save();
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  const split = mockCreate.mock.calls[0][0].split;
  expect(split.map((x: { memberId: string }) => x.memberId)).toEqual(["m2", "m3"]);
  expect(split.reduce((s: number, x: { owedMinor: number }) => s + x.owedMinor, 0)).toBe(100100);
});

test("US-07 deselecting everyone is rejected with a specific message and saves nothing", async () => {
  await render(<AddExpense />);
  await fill("500", "Dinner");
  await fireEvent.press(screen.getByRole("button", { name: /Change who's in/ }));
  for (const name of ["Asha (you)", "Ben", "Rahul, guest"]) await fireEvent.press(screen.getByRole("checkbox", { name }));
  await save();
  expect(await screen.findByText(/Pick at least one person to split with/)).toBeTruthy();
  expect(mockCreate).not.toHaveBeenCalled();
});

test("US-07 the payer can be left out of the split", async () => {
  mockCreate.mockResolvedValue({ ok: true });
  await render(<AddExpense />);
  await fill("500", "Gift");
  await fireEvent.press(screen.getByRole("button", { name: /Change who's in/ }));
  await fireEvent.press(screen.getByRole("checkbox", { name: "Asha (you)" }));
  await fireEvent.press(screen.getByRole("checkbox", { name: "Rahul, guest" }));
  await save();
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockCreate.mock.calls[0][0].split.map((x: { memberId: string }) => x.memberId)).toEqual(["m2"]);
  expect(mockCreate.mock.calls[0][0].paidBy).toBeUndefined();
});

test("US-08 the per-person amount updates as I change the amount and add or remove people", async () => {
  await render(<AddExpense />);
  await fill("1000", "Dinner");
  expect(screen.getByText("₹333.34 or ₹333.33 each")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: /Change who's in/ }));
  await fireEvent.press(screen.getByRole("checkbox", { name: "Rahul, guest" }));
  expect(screen.getByText("₹500.00 each")).toBeTruthy();
  expect(screen.getAllByText("₹500.00")).toHaveLength(2);
  await fireEvent.changeText(screen.getByLabelText("Amount"), "1200");
  expect(screen.getByText("₹600.00 each")).toBeTruthy();
  await fireEvent.press(screen.getByRole("checkbox", { name: "Rahul, guest" }));
  expect(screen.getByText("₹400.00 each")).toBeTruthy();
});

test("US-08 no amount yet means no per-person numbers", async () => {
  await render(<AddExpense />);
  await screen.findByLabelText("Amount");
  expect(screen.queryByText(/each$/)).toBeNull();
});
