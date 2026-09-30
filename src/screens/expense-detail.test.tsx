import { fireEvent, render, screen } from "@testing-library/react-native";
import ExpenseDetail from "../../app/trip/[id]/expense";

const mockLoad = jest.fn();
const mockPush = jest.fn();
jest.mock("../api/expenses", () => ({ loadExpenseView: (...a: unknown[]) => mockLoad(...a) }));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "t1", expenseId: "e1" }), useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const expense = (o: object = {}) => ({ ok: true, expense: {
  id: "e1", version: 2, title: "Dinner", amountMinor: 90000, date: "2026-12-02", category: "food", paidBy: "Asha", addedBy: "Ben", canEdit: true, method: "shares",
  currency: { code: "INR", exponent: 2 },
  people: [{ name: "Asha", guest: false, isMe: true, owedMinor: 60000, value: 2 }, { name: "Rahul", guest: true, isMe: false, owedMinor: 30000, value: 1 }], ...o } });
beforeEach(() => jest.clearAllMocks());

test("an expense shows its total, who paid and added it, and each person's share with its percentage and how it was split", async () => {
  mockLoad.mockResolvedValue(expense());
  await render(<ExpenseDetail />);
  expect(await screen.findByText("Dinner")).toBeTruthy();
  expect(screen.getByText("By shares")).toBeTruthy();
  expect(screen.getByText("Asha")).toBeTruthy();
  expect(screen.getByText("Ben")).toBeTruthy();
  expect(screen.getByLabelText("You, ₹600.00, 66.67 percent")).toBeTruthy();
  expect(screen.getByText("66.67% · 2 shares")).toBeTruthy();
  expect(screen.getByText("33.33% · 1 share")).toBeTruthy();
});

test("only someone who can edit sees Edit expense, and it opens the edit screen", async () => {
  mockLoad.mockResolvedValue(expense());
  await render(<ExpenseDetail />);
  await fireEvent.press(await screen.findByRole("button", { name: "Edit expense" }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/add-expense", params: { id: "t1", expenseId: "e1" } });
});

test("someone who cannot edit has no Edit expense button, and a load failure offers retry", async () => {
  mockLoad.mockResolvedValueOnce(expense({ canEdit: false }));
  await render(<ExpenseDetail />);
  await screen.findByText("Dinner");
  expect(screen.queryByRole("button", { name: "Edit expense" })).toBeNull();
  mockLoad.mockResolvedValueOnce({ ok: false, message: "No connection." });
  await render(<ExpenseDetail />);
  expect(await screen.findByRole("button", { name: "Retry" })).toBeTruthy();
});
