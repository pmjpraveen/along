import { fireEvent, render, screen } from "@testing-library/react-native";
import Balances from "../../app/trip/[id]/balances";

const mockLoad = jest.fn();
jest.mock("../api/balances", () => ({ loadBalances: (...a: unknown[]) => mockLoad(...a) }));
jest.mock("../hooks/useTripRealtime", () => ({ useTripRealtime: jest.fn() }));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "t1" }), useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const row = (memberId: string, name: string, net: number, isMe = false, costMinor = 0, paidMinor = 0) => ({ memberId, name, guest: false, isMe, isOwner: false, net, costMinor, paidMinor });
test("US-14 'To settle up' shows the pairs from the expenses, not people paying someone else", async () => {
  mockLoad.mockResolvedValue({
    ok: true, currency: { code: "INR", exponent: 2 },
    rows: [row("p", "Praveen", 2000, true), row("h", "Hemant", 1000), row("a", "Anusha", -1000), row("m", "Mohan", -2000)],
    transfers: [{ from: "m", to: "p", amountMinor: 2000 }, { from: "a", to: "h", amountMinor: 1000 }],
  });
  await render(<Balances />);
  expect(await screen.findByText("Mohan owes you ₹20.00")).toBeTruthy();
  expect(screen.getByText("Anusha owes Hemant ₹10.00")).toBeTruthy();
  expect(screen.queryByText(/Anusha owes you/)).toBeNull();
});

test("US-14 Everyone is one compact list: each person once, with what they owe or are owed, their total cost and what they paid", async () => {
  mockLoad.mockResolvedValue({
    ok: true, currency: { code: "INR", exponent: 2 },
    rows: [row("p", "Praveen", 2000, true, 1000, 3000), row("m", "Mohan", -2000, false, 2000, 0), row("z", "Zed", 0, false, 0, 0)],
    transfers: [{ from: "m", to: "p", amountMinor: 2000 }],
  });
  await render(<Balances />);
  expect(await screen.findByText("Everyone's totals")).toBeTruthy();
  expect(screen.queryByText("Cost per person")).toBeNull();                       // one list, not two that repeat each other
  expect(screen.getByLabelText("You. Owed ₹20.00. Total cost ₹10.00, paid ₹30.00")).toBeTruthy();
  expect(screen.getByLabelText("Mohan. Owes ₹20.00. Total cost ₹20.00, paid ₹0.00")).toBeTruthy();
  expect(screen.getByLabelText("Zed. Settled up. Total cost ₹0.00, paid ₹0.00")).toBeTruthy();
  expect(screen.getByText("Cost ₹10.00 · Paid ₹30.00")).toBeTruthy();
});

test("US-14 everyone's totals are always shown, with no fold or toggle", async () => {
  mockLoad.mockResolvedValue({ ok: true, currency: { code: "INR", exponent: 2 }, rows: [row("p", "Praveen", 1000, true), row("m", "Mohan", -1000)], transfers: [{ from: "m", to: "p", amountMinor: 1000 }] });
  await render(<Balances />);
  expect(await screen.findByLabelText(/^Mohan\./)).toBeTruthy();
  expect(screen.queryByRole("button", { name: /^Everyone's totals/ })).toBeNull();
});

test("US-14 Everyone's totals are listed before To settle up", async () => {
  mockLoad.mockResolvedValue({ ok: true, currency: { code: "INR", exponent: 2 }, rows: [row("p", "Praveen", 1000, true), row("m", "Mohan", -1000)], transfers: [{ from: "m", to: "p", amountMinor: 1000 }] });
  await render(<Balances />);
  await screen.findByText("Everyone's totals");
  const headings = screen.getAllByRole("header").map((h) => String(h.props.children));
  expect(headings.indexOf("Everyone's totals")).toBeGreaterThan(-1);
  expect(headings.indexOf("Everyone's totals")).toBeLessThan(headings.indexOf("To settle up"));
});

test("US-14 the settle-up list shows the first four payments, with Show more for the rest", async () => {
  const rows = [row("p", "Praveen", 6000, true), ...["a", "b", "c", "d", "e", "f"].map((n) => row(n, `Person ${n}`, -1000))];
  mockLoad.mockResolvedValue({ ok: true, currency: { code: "INR", exponent: 2 }, rows, transfers: ["a", "b", "c", "d", "e", "f"].map((n) => ({ from: n, to: "p", amountMinor: 1000 })) });
  await render(<Balances />);
  expect(await screen.findByText("Person a owes you ₹10.00")).toBeTruthy();
  expect(screen.getByText("Person d owes you ₹10.00")).toBeTruthy();
  expect(screen.queryByText("Person e owes you ₹10.00")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Show 2 more" }));
  expect(screen.getByText("Person f owes you ₹10.00")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Show fewer" })).toBeTruthy();
});
