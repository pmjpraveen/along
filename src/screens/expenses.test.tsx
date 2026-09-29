import { render, screen } from "@testing-library/react-native";
import Expenses from "../../app/trip/[id]/expenses";
import Balances from "../../app/trip/[id]/balances";

const mockList = jest.fn();
const mockBal = jest.fn();
jest.mock("../api/expenses", () => ({ listExpenses: (...a: unknown[]) => mockList(...a) }));
jest.mock("../api/balances", () => ({ loadBalances: (...a: unknown[]) => mockBal(...a) }));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "t1" }), useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const cur = { code: "INR", exponent: 2 };
const rows = [
  { memberId: "m2", name: "Ben", guest: false, isMe: false, net: -50000 },
  { memberId: "m1", name: "Asha", guest: false, isMe: true, net: 50000 },
  { memberId: "m3", name: "Rahul", guest: true, isMe: false, net: 0 },
];
beforeEach(() => {
  jest.clearAllMocks();
  mockList.mockResolvedValue({ ok: true, currency: cur, expenses: [{ id: "e1", title: "Lunch", amount_minor: 100000, expense_date: "2026-12-02", paidBy: "Asha", addedBy: "Asha" }] });
  mockBal.mockResolvedValue({ ok: true, currency: cur, rows });
});

test("US-09 the expenses screen shows my running balance in plain words", async () => {
  await render(<Expenses />);
  expect(await screen.findByText("You're owed ₹500.00")).toBeTruthy();
  expect(screen.getByText("Lunch")).toBeTruthy();
});

test("US-09 a balance failure does not hide the expense list", async () => {
  mockBal.mockResolvedValue({ ok: false, message: "No connection." });
  await render(<Expenses />);
  expect(await screen.findByText("Lunch")).toBeTruthy();
  expect(screen.queryByText(/You're owed/)).toBeNull();
});

test("US-09 the balances screen lists everyone, me first, including members who are settled", async () => {
  await render(<Balances />);
  expect(await screen.findByText("You're owed ₹500.00")).toBeTruthy();
  expect(screen.getByText("Ben owes ₹500.00")).toBeTruthy();
  expect(screen.getByText("Rahul is settled up")).toBeTruthy();
});

test("US-09 a balances load failure shows retry", async () => {
  mockBal.mockResolvedValue({ ok: false, message: "No connection. Check your internet and try again." });
  await render(<Balances />);
  expect(await screen.findByRole("button", { name: "Retry" })).toBeTruthy();
});
