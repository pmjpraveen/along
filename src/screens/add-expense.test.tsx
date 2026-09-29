import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import AddExpense from "../../app/trip/[id]/add-expense";

const mockCreate = jest.fn();
const mockBack = jest.fn();
const mockUpdate = jest.fn();
const mockQueue = jest.fn();
jest.mock("../offline/sync", () => ({ queueExpense: (...a: unknown[]) => mockQueue(...a) }));
let mockExpenseId: string | undefined;
jest.mock("../api/expenses", () => ({
  updateExpense: (...a: unknown[]) => mockUpdate(...a),
  loadExpense: async () => ({ ok: true, expense: { id: "e1", version: 3, title: "Dinner", amountMinor: 90000, date: "2026-12-02", paidBy: "m2", method: "equal",
    people: [{ memberId: "m1", owedMinor: 45000, value: null }, { memberId: "m2", owedMinor: 45000, value: null }] } }),
  loadExpenseForm: async () => ({ ok: true, data: { currency: { code: "INR", exponent: 2 }, members: [
    { id: "m2", name: "Ben", guest: false, isMe: false }, { id: "m1", name: "Asha", guest: false, isMe: true }, { id: "m3", name: "Rahul", guest: true, isMe: false } ] } }),
  createExpense: (...a: unknown[]) => mockCreate(...a),
}));
jest.mock("expo-router", () => ({ useLocalSearchParams: () => ({ id: "t1", expenseId: mockExpenseId }), useRouter: () => ({ back: mockBack }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
beforeEach(() => { jest.clearAllMocks(); mockExpenseId = undefined; });

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
  expect(screen.getByText("Enter what this was for.")).toBeTruthy();
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

test("4.4 the per-person amount updates as I change the amount and add or remove people", async () => {
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

test("4.4 no amount yet means no per-person numbers", async () => {
  await render(<AddExpense />);
  await screen.findByLabelText("Amount");
  expect(screen.queryByText(/each$/)).toBeNull();
});

test("5.1 custom amounts show what is left live and save with the custom method once they equal the total", async () => {
  mockCreate.mockResolvedValue({ ok: true });
  await render(<AddExpense />);
  await fill("1000", "Hotel");
  await fireEvent.press(screen.getByRole("radio", { name: "Custom amounts" }));
  await fireEvent.press(screen.getByRole("button", { name: /Change who's in/ }));
  await fireEvent.press(screen.getByRole("checkbox", { name: "Rahul, guest" }));
  await fireEvent.changeText(screen.getByLabelText("Amount for You"), "700");
  await fireEvent.changeText(screen.getByLabelText("Amount for Ben"), "200");
  expect(screen.getByText(/₹100.00 still to assign/)).toBeTruthy();
  await save();
  expect((await screen.findAllByText(/₹100.00 still to assign/)).length).toBe(2); // live status + form error
  expect(mockCreate).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText("Amount for Ben"), "300");
  expect(screen.getByText("✓ Fully assigned")).toBeTruthy();
  await save();
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  const call = mockCreate.mock.calls[0][0];
  expect(call.method).toBe("custom");
  expect(call.split).toEqual([{ memberId: "m1", owedMinor: 70000 }, { memberId: "m2", owedMinor: 30000 }]);
});

test("5.1 going over the total is called out and blocked", async () => {
  await render(<AddExpense />);
  await fill("1000", "Hotel");
  await fireEvent.press(screen.getByRole("radio", { name: "Custom amounts" }));
  await fireEvent.press(screen.getByRole("button", { name: /Change who's in/ }));
  await fireEvent.press(screen.getByRole("checkbox", { name: "Rahul, guest" }));
  await fireEvent.changeText(screen.getByLabelText("Amount for You"), "800");
  await fireEvent.changeText(screen.getByLabelText("Amount for Ben"), "300");
  expect(screen.getByText(/Over by ₹100.00/)).toBeTruthy();
  await save();
  expect(mockCreate).not.toHaveBeenCalled();
});

test("5.1 switching to custom starts from the current equal split so the user only adjusts", async () => {
  await render(<AddExpense />);
  await fill("900", "Hotel");
  await fireEvent.press(screen.getByRole("radio", { name: "Custom amounts" }));
  await fireEvent.press(screen.getByRole("button", { name: /Change who's in/ }));
  expect(screen.getByLabelText("Amount for You").props.value).toBe("300.00");
  expect(screen.getByText("✓ Fully assigned")).toBeTruthy();
});

test("5.2 percentages that total 100% save each calculated share and the basis points", async () => {
  mockCreate.mockResolvedValue({ ok: true });
  await render(<AddExpense />);
  await fill("1001", "Hotel");
  await fireEvent.press(screen.getByRole("radio", { name: "Percent" }));
  await fireEvent.press(screen.getByRole("button", { name: /Change who's in/ }));
  await fireEvent.press(screen.getByRole("checkbox", { name: "Rahul, guest" }));
  await fireEvent.changeText(screen.getByLabelText("Percent for You"), "60");
  await fireEvent.changeText(screen.getByLabelText("Percent for Ben"), "40");
  expect(screen.getByText("✓ Totals 100%")).toBeTruthy();
  await save();
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  const call = mockCreate.mock.calls[0][0];
  expect(call.method).toBe("percentage");
  expect(call.values).toEqual({ m1: 6000, m2: 4000 });
  expect(call.split).toEqual([{ memberId: "m1", owedMinor: 60060 }, { memberId: "m2", owedMinor: 40040 }]);
});

test("5.2 percentages under or over 100% are called out and blocked", async () => {
  await render(<AddExpense />);
  await fill("1000", "Hotel");
  await fireEvent.press(screen.getByRole("radio", { name: "Percent" }));
  await fireEvent.press(screen.getByRole("button", { name: /Change who's in/ }));
  await fireEvent.press(screen.getByRole("checkbox", { name: "Rahul, guest" }));
  await fireEvent.changeText(screen.getByLabelText("Percent for You"), "60");
  await fireEvent.changeText(screen.getByLabelText("Percent for Ben"), "30");
  expect(screen.getByText(/10.00% still to assign/)).toBeTruthy();
  await save();
  expect(mockCreate).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText("Percent for Ben"), "45.5");
  expect(screen.getByText(/Over by 5.50%/)).toBeTruthy();
});

test("5.2 switching to percent starts from an equal percentage split", async () => {
  await render(<AddExpense />);
  await fill("900", "Hotel");
  await fireEvent.press(screen.getByRole("radio", { name: "Percent" }));
  await fireEvent.press(screen.getByRole("button", { name: /Change who's in/ }));
  expect(screen.getByLabelText("Percent for You").props.value).toBe("33.34");
  expect(screen.getByLabelText("Percent for Ben").props.value).toBe("33.33");
  expect(screen.getByText("✓ Totals 100%")).toBeTruthy();
});

test("5.3 shares calculate proportional amounts live and save with the shares as split values", async () => {
  mockCreate.mockResolvedValue({ ok: true });
  await render(<AddExpense />);
  await fill("1000", "Hotel");
  await fireEvent.press(screen.getByRole("radio", { name: "Shares" }));
  await fireEvent.press(screen.getByRole("button", { name: /Change who's in/ }));
  await fireEvent.press(screen.getByRole("checkbox", { name: "Rahul, guest" }));
  await fireEvent.changeText(screen.getByLabelText("Shares for You"), "3");
  await fireEvent.changeText(screen.getByLabelText("Shares for Ben"), "1");
  expect(screen.getByText("₹750.00")).toBeTruthy();
  expect(screen.getByText("₹250.00")).toBeTruthy();
  expect(screen.getByText("✓ 4 shares in total")).toBeTruthy();
  await save();
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  const call = mockCreate.mock.calls[0][0];
  expect(call.method).toBe("shares");
  expect(call.values).toEqual({ m1: 3, m2: 1 });
  expect(call.split).toEqual([{ memberId: "m1", owedMinor: 75000 }, { memberId: "m2", owedMinor: 25000 }]);
});

test("5.3 switching to shares starts everyone at one share, and a person set to 0 is left out", async () => {
  mockCreate.mockResolvedValue({ ok: true });
  await render(<AddExpense />);
  await fill("900", "Hotel");
  await fireEvent.press(screen.getByRole("radio", { name: "Shares" }));
  await fireEvent.press(screen.getByRole("button", { name: /Change who's in/ }));
  expect(screen.getByLabelText("Shares for You").props.value).toBe("1");
  await fireEvent.changeText(screen.getByLabelText("Shares for Ben"), "0");
  await save();
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  const split = mockCreate.mock.calls[0][0].split;
  expect(split.map((x: { memberId: string }) => x.memberId)).toEqual(["m1", "m3"]);
  expect(split.reduce((s: number, x: { owedMinor: number }) => s + x.owedMinor, 0)).toBe(90000);
});

test("5.3 nobody with a share blocks the save with a specific message", async () => {
  await render(<AddExpense />);
  await fill("900", "Hotel");
  await fireEvent.press(screen.getByRole("radio", { name: "Shares" }));
  await fireEvent.press(screen.getByRole("button", { name: /Change who's in/ }));
  for (const n of ["You", "Ben"]) await fireEvent.changeText(screen.getByLabelText(`Shares for ${n}`), "0");
  await fireEvent.changeText(screen.getByLabelText("Shares for Rahul"), "0");
  await save();
  expect(await screen.findByText(/Enter shares for at least one person/)).toBeTruthy();
  expect(mockCreate).not.toHaveBeenCalled();
});

test("5.7 opening an expense to edit loads its values, and saving sends the version I opened", async () => {
  mockExpenseId = "e1";
  mockUpdate.mockResolvedValue({ ok: true });
  await render(<AddExpense />);
  expect(await screen.findByText("Edit expense")).toBeTruthy();
  await waitFor(() => expect(screen.getByLabelText("Amount").props.value).toBe("900.00"));
  expect(screen.getByLabelText("Title").props.value).toBe("Dinner");
  expect(screen.getByRole("button", { name: /Ben paid/ })).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText("Amount"), "1000");
  await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockCreate).not.toHaveBeenCalled();
  expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ expenseId: "e1", version: 3, amountMinor: 100000, date: "2026-12-02", paidBy: "m2", method: "equal" }));
  expect(mockUpdate.mock.calls[0][0].split).toEqual([{ memberId: "m1", owedMinor: 50000 }, { memberId: "m2", owedMinor: 50000 }]);
});

test("5.7 a rejected edit keeps my changes and shows the reason", async () => {
  mockExpenseId = "e1";
  mockUpdate.mockResolvedValue({ ok: false, message: "Only the person who added this expense or the trip owner can edit it." });
  await render(<AddExpense />);
  await waitFor(() => expect(screen.getByLabelText("Amount").props.value).toBe("900.00"));
  await fireEvent.changeText(screen.getByLabelText("Title"), "Dinner out");
  await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByText(/person who added this expense/)).toBeTruthy();
  expect(screen.getByLabelText("Title").props.value).toBe("Dinner out");
  expect(mockBack).not.toHaveBeenCalled();
});

test("6.2 with no connection the expense is queued with its key and the screen closes as saved", async () => {
  mockCreate.mockResolvedValue({ ok: false, message: "No connection. Check your internet and try again.", retry: true });
  await render(<AddExpense />);
  await fill("250.50", "Taxi");
  await save();
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockQueue).toHaveBeenCalledTimes(1);
  const queued = mockQueue.mock.calls[0][0];
  expect(queued).toMatchObject({ tripId: "t1", title: "Taxi", amountMinor: 25050, key: mockCreate.mock.calls[0][0].key });
  expect(queued.split.reduce((s: number, x: { owedMinor: number }) => s + x.owedMinor, 0)).toBe(25050);
});

test("6.2 a real rejection is not queued: the form stays with the error", async () => {
  mockCreate.mockResolvedValue({ ok: false, message: "Couldn't save the expense. Try again." });
  await render(<AddExpense />);
  await fill("250.50", "Taxi");
  await save();
  expect(await screen.findByText(/Couldn't save the expense/)).toBeTruthy();
  expect(mockQueue).not.toHaveBeenCalled();
  expect(mockBack).not.toHaveBeenCalled();
});

test("6.2 an edit made offline is not queued (only new expenses are)", async () => {
  mockExpenseId = "e1";
  mockUpdate.mockResolvedValue({ ok: false, message: "No connection.", retry: true });
  await render(<AddExpense />);
  await waitFor(() => expect(screen.getByLabelText("Amount").props.value).toBe("900.00"));
  await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByText(/No connection/)).toBeTruthy();
  expect(mockQueue).not.toHaveBeenCalled();
  expect(mockBack).not.toHaveBeenCalled();
});
