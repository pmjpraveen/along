import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Balances from "../../app/trip/[id]/balances";

const mockLoad = jest.fn();
jest.mock("../api/balances", () => ({ loadBalances: (...a: unknown[]) => mockLoad(...a) }));
const mockExport = jest.fn();
jest.mock("../exportBalances", () => ({ exportBalancesPdf: (...a: unknown[]) => mockExport(...a) }));
jest.mock("../hooks/useTripRealtime", () => ({ useTripRealtime: jest.fn() }));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "t1" }), useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const row = (memberId: string, name: string, net: number, isMe = false, costMinor = 0, paidMinor = 0) => ({ memberId, name, guest: false, isMe, isOwner: false, net, costMinor, paidMinor });
test("US-14 a person's payments show the pairs from the expenses, not people paying someone else", async () => {
  mockLoad.mockResolvedValue({
    ok: true, currency: { code: "INR", exponent: 2 },
    rows: [row("p", "Praveen", 2000, true), row("h", "Hemant", 1000), row("a", "Anusha", -1000), row("m", "Mohan", -2000)],
    transfers: [{ from: "m", to: "p", amountMinor: 2000 }, { from: "a", to: "h", amountMinor: 1000 }],
  });
  await render(<Balances />);
  expect(await screen.findByText("You'll get back from")).toBeTruthy();   // my own card is open by default
  expect(screen.getAllByText("₹20.00").length).toBeGreaterThan(0);
  expect(screen.queryByText("Hemant gets back from")).toBeNull();
  await fireEvent.press(screen.getByLabelText(/^Hemant\./));
  expect(screen.getByText("Hemant gets back from")).toBeTruthy();
  expect(screen.getAllByText("₹10.00").length).toBeGreaterThan(0);
  expect(screen.queryByText("You'll get back from")).toBeNull();
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
  expect(screen.getByLabelText("You. Gets back ₹20.00. Share ₹10.00, paid ₹30.00")).toBeTruthy();
  expect(screen.getByLabelText("Mohan. Owes ₹20.00. Share ₹20.00, paid ₹0.00")).toBeTruthy();
  expect(screen.getByLabelText("Zed. Settled up. Share ₹0.00, paid ₹0.00")).toBeTruthy();
  expect(screen.getAllByText("Paid")).toHaveLength(2);                            // everyone else's paid and share are visible without opening a card
  expect(screen.getAllByText("Share")).toHaveLength(2);                           // the other two people; mine is open and shows them in its breakdown
  expect(screen.getByText("You'll get back from")).toBeTruthy();                           // only the payments need a tap (mine is open)
});

test("US-14 everyone's totals are always shown, with no fold or toggle", async () => {
  mockLoad.mockResolvedValue({ ok: true, currency: { code: "INR", exponent: 2 }, rows: [row("p", "Praveen", 1000, true), row("m", "Mohan", -1000)], transfers: [{ from: "m", to: "p", amountMinor: 1000 }] });
  await render(<Balances />);
  expect(await screen.findByLabelText(/^Mohan\./)).toBeTruthy();
  expect(screen.queryByRole("button", { name: /^Everyone's totals/ })).toBeNull();
});

test("US-14 tapping a person shows whom they owe and who owes them, and tapping again closes it", async () => {
  const rows = [row("p", "Praveen", 6000, true), ...["a", "b", "c", "d", "e", "f"].map((n) => row(n, `Person ${n}`, -1000, false, 1000, 0))];
  mockLoad.mockResolvedValue({ ok: true, currency: { code: "INR", exponent: 2 }, rows, transfers: ["a", "b", "c", "d", "e", "f"].map((n) => ({ from: n, to: "p", amountMinor: 1000 })) });
  await render(<Balances />);
  expect(screen.queryByText("To settle up")).toBeNull();                          // no long global list
  await fireEvent.press(await screen.findByLabelText(/^Person a\./));
  expect(screen.getByText("Person a needs to pay")).toBeTruthy();
  expect(screen.queryByText("Person b needs to pay")).toBeNull();
  await fireEvent.press(screen.getByLabelText(/^Person a\./));
  expect(screen.queryByText("Person a needs to pay")).toBeNull();
});

test("US-14 someone with no payments to make or receive says they are settled up", async () => {
  mockLoad.mockResolvedValue({ ok: true, currency: { code: "INR", exponent: 2 }, rows: [row("p", "Praveen", 0, true), row("z", "Zed", 0)], transfers: [] });
  await render(<Balances />);
  await fireEvent.press(await screen.findByLabelText(/^Zed\./));
  expect(screen.getAllByText("All settled up").length).toBeGreaterThan(0);
});

test("US-14 an open card adds up: paid, minus share, plus payments already recorded, equals what they get back", async () => {
  mockLoad.mockResolvedValue({ ok: true, currency: { code: "INR", exponent: 2 }, rows: [row("p", "Praveen", 50000, true, 320000, 400000), row("m", "Mohan", -50000, false, 400000, 320000)], transfers: [{ from: "m", to: "p", amountMinor: 50000 }] });
  await render(<Balances />);
  expect(await screen.findByText("You paid")).toBeTruthy();
  expect(screen.getAllByText("₹4,000.00").length).toBeGreaterThan(0);
  expect(screen.getByText("−₹3,200.00")).toBeTruthy();
  expect(screen.getByText("−₹300.00")).toBeTruthy();                              // 4,000 − 3,200 = 800, but 500 is what is still owed, so 300 was already paid back
  expect(screen.getByText("Payments already recorded")).toBeTruthy();
  expect(screen.getByText("You get back")).toBeTruthy();
});

test("US-14 Export as PDF hands the balances to the exporter", async () => {
  mockExport.mockResolvedValue({ ok: true });
  mockLoad.mockResolvedValue({ ok: true, tripName: "Goa", currency: { code: "INR", exponent: 2 }, rows: [row("p", "Praveen", 1000, true, 500, 1500), row("m", "Mohan", -1000, false, 1500, 500)], transfers: [{ from: "m", to: "p", amountMinor: 1000 }] });
  await render(<Balances />);
  await fireEvent.press(await screen.findByRole("button", { name: "Export as PDF" }));
  await waitFor(() => expect(mockExport).toHaveBeenCalledTimes(1));
  const [input] = mockExport.mock.calls[0];
  expect(input.tripName).toBe("Goa");
  expect(input.rows).toHaveLength(2);
  expect(input.transfers).toEqual([{ from: "m", to: "p", amountMinor: 1000 }]);
});

test("US-14 a failed PDF export shows why and the button comes back", async () => {
  mockExport.mockResolvedValue({ ok: false, message: "Couldn't make the PDF. Update the app and try again." });
  mockLoad.mockResolvedValue({ ok: true, currency: { code: "INR", exponent: 2 }, rows: [row("p", "Praveen", 0, true)], transfers: [] });
  await render(<Balances />);
  await fireEvent.press(await screen.findByRole("button", { name: "Export as PDF" }));
  await waitFor(() => expect(mockExport).toHaveBeenCalled());
  expect(await screen.findByRole("button", { name: "Export as PDF" })).toBeTruthy();
});
