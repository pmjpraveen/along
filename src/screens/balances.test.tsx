import { render, screen } from "@testing-library/react-native";
import Balances from "../../app/trip/[id]/balances";

const mockLoad = jest.fn();
jest.mock("../api/balances", () => ({ loadBalances: (...a: unknown[]) => mockLoad(...a) }));
jest.mock("../hooks/useTripRealtime", () => ({ useTripRealtime: jest.fn() }));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "t1" }), useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const row = (memberId: string, name: string, net: number, isMe = false) => ({ memberId, name, guest: false, isMe, isOwner: false, net });
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
