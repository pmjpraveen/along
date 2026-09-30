import { fireEvent, render, screen } from "@testing-library/react-native";
import TripHistory from "../../app/history";

const mockList = jest.fn();
const mockPush = jest.fn();
jest.mock("../api/trips", () => ({ listTrips: (...a: unknown[]) => mockList(...a) }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true, replace: jest.fn() }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const trip = (o: object) => ({ id: "t1", name: "Ooty weekend", destination_name: "Ooty, India", start_date: "2026-05-07", end_date: "2026-05-09", phase: "completed", coverUrl: null, ...o });
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
