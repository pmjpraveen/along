import { fireEvent, render, screen } from "@testing-library/react-native";
import TripHistory from "../../app/history";

const mockList = jest.fn();
const mockPush = jest.fn();
jest.mock("../api/trips", () => ({ listTrips: (...a: unknown[]) => mockList(...a) }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true, replace: jest.fn() }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const trip = (o: object) => ({ id: "t1", name: "Ooty weekend", destination_name: "Ooty, India", start_date: "2026-05-07", end_date: "2026-05-09", phase: "completed", coverUrl: null, cardColor: 2, ...o });
beforeEach(() => jest.clearAllMocks());

test("Trip history lists only finished trips with their place and dates, and opens a trip's summary", async () => {
  mockList.mockResolvedValue({ ok: true, trips: [trip({}), trip({ id: "t2", name: "Goa", phase: "active" })] });
  await render(<TripHistory />);
  await fireEvent.press(await screen.findByRole("button", { name: "Ooty weekend, Ooty, India, 7 May - 9 May" }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/trip/[id]/summary", params: { id: "t1" } });
  expect(screen.queryByText("Goa")).toBeNull();
});

test("with no finished trips it says how one gets here, and a load failure offers retry", async () => {
  mockList.mockResolvedValueOnce({ ok: true, trips: [] });
  await render(<TripHistory />);
  expect(await screen.findByText(/No finished trips yet/)).toBeTruthy();
  mockList.mockResolvedValueOnce({ ok: false, message: "No connection." });
  await render(<TripHistory />);
  expect(await screen.findByRole("button", { name: "Retry" })).toBeTruthy();
});

test("each card is the trip's own colour: the same trip always shows the colour its page does", async () => {
  mockList.mockResolvedValue({ ok: true, trips: [trip({ id: "a", name: "Orange one", cardColor: 0 }), trip({ id: "b", name: "Yellow one", cardColor: 5 })] });
  await render(<TripHistory />);
  const bg = (name: string) => {
    const card = screen.getByRole("button", { name: new RegExp(`^${name},`) });
    const colours: string[] = [];
    const walk = (n: any) => { const st = Array.isArray(n.props?.style) ? Object.assign({}, ...n.props.style.flat(9).filter(Boolean)) : n.props?.style; if (st?.backgroundColor) colours.push(st.backgroundColor); (n.children ?? []).forEach((c: any) => typeof c === "object" && walk(c)); };
    walk(card);
    return colours;
  };
  expect(bg("Orange one")).toContain("#ffc091");
  expect(bg("Yellow one")).toContain("#fff27b");
});
